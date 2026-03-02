"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { DatedMessage, UndatedMessage } from "../types/message";
import { db } from "../firebase";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    QueryDocumentSnapshot,
    DocumentData,
} from "firebase/firestore";

// ------------------------------------------------------------
// 内部型: Firestore ドキュメントID を保持（外部には _docId? として露出）
// ------------------------------------------------------------
export type DatedWithId = DatedMessage & { _docId?: string };
export type UndatedWithId = UndatedMessage & { _docId?: string };

// Firestore へ書き込む前に _docId を除去するヘルパー
function omitDocId<T extends { _docId?: string }>(msg: T): Omit<T, "_docId"> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _docId, ...data } = msg;
    return data as Omit<T, "_docId">;
}

// ------------------------------------------------------------
// Context 型定義
// ------------------------------------------------------------
type MessageStoreContextType = {
    datedMessages: DatedWithId[];
    undatedMessages: UndatedWithId[];
    pastDatedMessages: DatedWithId[];
    pastUndatedMessages: UndatedWithId[];

    addDatedMessage: (msg: DatedMessage) => Promise<void>;
    addUndatedMessage: (msg: UndatedMessage) => Promise<void>;
    loadMessages: () => Promise<void>;
    moveUndatedToPast: (index: number) => Promise<void>;
    movePastDatedMessages: () => Promise<void>;
    deletePastDatedMessage: (index: number) => Promise<void>;
    deletePastUndatedMessage: (index: number) => Promise<void>;
    deleteDatedMessage: (msg: DatedWithId) => Promise<void>;
    deleteUndatedMessage: (msg: UndatedWithId) => Promise<void>;
    deletePastDatedGroup: (date: string) => Promise<void>;
    deleteDatedGroup: (date: string) => Promise<void>;
    moveOneDatedToPast: (msg: DatedWithId) => Promise<void>;
    restorePastDatedMessage: (index: number) => Promise<void>;
    restorePastUndatedMessage: (index: number) => Promise<void>;
};

const MessageStoreContext = createContext<MessageStoreContextType | null>(null);

// ------------------------------------------------------------
// Provider（useState を直接持つことで Hooks ルールに準拠）
// ------------------------------------------------------------
export function MessageStoreProvider({ children }: { children: ReactNode }) {
    const [datedMessages, setDatedMessages] = useState<DatedWithId[]>([]);
    const [undatedMessages, setUndatedMessages] = useState<UndatedWithId[]>([]);
    const [pastDatedMessages, setPastDatedMessages] = useState<DatedWithId[]>([]);
    const [pastUndatedMessages, setPastUndatedMessages] = useState<UndatedWithId[]>([]);

    // Firestore collections
    const datedCol = collection(db, "datedMessages");
    const undatedCol = collection(db, "undatedMessages");
    const pastDatedCol = collection(db, "pastDatedMessages");
    const pastUndatedCol = collection(db, "pastUndatedMessages");

    // イミュータブルなソート（元配列を変更しない）
    const safeSort = (arr: DatedWithId[]): DatedWithId[] =>
        [...arr].sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
        });

    // notes / detail どちらかを返す共通ヘルパー
    const bodyOfUndated = (m: UndatedWithId): string =>
        (m.notes ?? m.detail ?? "").trim();

    // Firestore snapshot → DatedWithId
    const toDM = (d: QueryDocumentSnapshot<DocumentData>): DatedWithId => ({
        ...(d.data() as DatedMessage),
        notes: (d.data() as DatedMessage).notes ?? "",
        _docId: d.id,
    });

    // Firestore snapshot → UndatedWithId
    const toUM = (d: QueryDocumentSnapshot<DocumentData>): UndatedWithId => ({
        ...(d.data() as UndatedMessage),
        notes: (d.data() as UndatedMessage).notes ?? "",
        date: (d.data() as UndatedMessage).date ?? null,
        _docId: d.id,
    });

    // ---------------------------------------------------
    // 追加
    // ---------------------------------------------------
    const addDatedMessage = async (msg: DatedMessage) => {
        const docRef = await addDoc(datedCol, msg);
        setDatedMessages((prev) => safeSort([...prev, { ...msg, _docId: docRef.id }]));
    };

    const addUndatedMessage = async (msg: UndatedMessage) => {
        const docRef = await addDoc(undatedCol, msg);
        setUndatedMessages((prev) => [...prev, { ...msg, _docId: docRef.id }]);
    };

    // ---------------------------------------------------
    // 全件読み込み（並列実行）
    // ---------------------------------------------------
    const loadMessages = async () => {
        const [datedSnap, undatedSnap, pastDatedSnap, pastUndatedSnap] = await Promise.all([
            getDocs(datedCol),
            getDocs(undatedCol),
            getDocs(pastDatedCol),
            getDocs(pastUndatedCol),
        ]);

        setDatedMessages(safeSort(datedSnap.docs.map(toDM)));
        setUndatedMessages(undatedSnap.docs.map(toUM));
        setPastDatedMessages(safeSort(pastDatedSnap.docs.map(toDM)));
        setPastUndatedMessages(pastUndatedSnap.docs.map(toUM));
    };

    // ---------------------------------------------------
    // 日付なし → 過去倉庫
    // ---------------------------------------------------
    const moveUndatedToPast = async (index: number) => {
        const msg = undatedMessages[index];
        if (!msg) return;

        // 過去倉庫に書き込み（新しい docId を取得）
        const docRef = await addDoc(pastUndatedCol, omitDocId(msg));

        // 元の undatedMessages から削除
        if (msg._docId) {
            await deleteDoc(doc(db, "undatedMessages", msg._docId));
        } else {
            // フォールバック: コンテンツ照合
            const snap = await getDocs(undatedCol);
            const target = snap.docs.find((d) => {
                const data = d.data() as UndatedMessage;
                return (
                    data.title === msg.title &&
                    (data.notes ?? data.detail ?? "").trim() === bodyOfUndated(msg)
                );
            });
            if (target) await deleteDoc(doc(db, "undatedMessages", target.id));
        }

        setUndatedMessages((prev) => prev.filter((_, i) => i !== index));
        setPastUndatedMessages((prev) => [...prev, { ...msg, _docId: docRef.id }]);
    };

    // ---------------------------------------------------
    // 日付あり → 過去倉庫（自動判定・初回マウント時）
    // ---------------------------------------------------
    const movePastDatedMessages = async () => {
        const now = new Date();
        const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const today = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());

        const toMove: DatedWithId[] = [];
        const remaining: DatedWithId[] = [];

        for (const msg of datedMessages) {
            let msgDate: Date | null = null;
            if (msg.date && /^\d{4}-\d{2}-\d{2}$/.test(msg.date)) {
                const parts = msg.date.split("-").map(Number);
                msgDate = new Date(parts[0], parts[1] - 1, parts[2]);
            }
            if (!msgDate || msgDate >= today) {
                remaining.push(msg);
            } else {
                toMove.push(msg);
            }
        }

        if (toMove.length === 0) return;

        // 並列で移動処理
        const newPastMsgs = await Promise.all(
            toMove.map(async (msg) => {
                const docRef = await addDoc(pastDatedCol, omitDocId(msg));
                if (msg._docId) {
                    await deleteDoc(doc(db, "datedMessages", msg._docId));
                }
                return { ...msg, _docId: docRef.id };
            })
        );

        setDatedMessages(remaining);
        setPastDatedMessages((prev) => safeSort([...prev, ...newPastMsgs]));
    };

    // ---------------------------------------------------
    // 1件を手動で過去倉庫へ移動
    // ---------------------------------------------------
    const moveOneDatedToPast = async (msg: DatedWithId) => {
        const docRef = await addDoc(pastDatedCol, omitDocId(msg));

        if (msg._docId) {
            await deleteDoc(doc(db, "datedMessages", msg._docId));
        } else {
            const snap = await getDocs(datedCol);
            const target = snap.docs.find((d) => {
                const data = d.data() as DatedMessage;
                return data.date === msg.date && data.title === msg.title && data.notes === msg.notes;
            });
            if (target) await deleteDoc(doc(db, "datedMessages", target.id));
        }

        setDatedMessages((prev) =>
            prev.filter((m) =>
                msg._docId ? m._docId !== msg._docId : !(m.date === msg.date && m.title === msg.title && m.notes === msg.notes)
            )
        );
        setPastDatedMessages((prev) => safeSort([...prev, { ...msg, _docId: docRef.id }]));
    };

    // ---------------------------------------------------
    // 各種削除
    // ---------------------------------------------------
    const deleteDatedMessage = async (msg: DatedWithId) => {
        if (msg._docId) {
            await deleteDoc(doc(db, "datedMessages", msg._docId));
        } else {
            const snap = await getDocs(datedCol);
            const target = snap.docs.find((d) => {
                const data = d.data() as DatedMessage;
                return data.date === msg.date && data.title === msg.title && data.notes === msg.notes;
            });
            if (target) await deleteDoc(doc(db, "datedMessages", target.id));
        }

        setDatedMessages((prev) =>
            prev.filter((m) =>
                msg._docId ? m._docId !== msg._docId : !(m.date === msg.date && m.title === msg.title && m.notes === msg.notes)
            )
        );
    };

    const deleteUndatedMessage = async (msg: UndatedWithId) => {
        if (msg._docId) {
            await deleteDoc(doc(db, "undatedMessages", msg._docId));
            setUndatedMessages((prev) => prev.filter((m) => m._docId !== msg._docId));
        } else {
            // フォールバック: タイトル＋本文の両方で照合（タイトルのみでは削除しない）
            const keyTitle = msg.title?.trim() ?? "";
            const keyBody = bodyOfUndated(msg);
            const snap = await getDocs(undatedCol);
            for (const d of snap.docs) {
                const data = d.data() as UndatedMessage;
                if (
                    data.title?.trim() === keyTitle &&
                    (data.notes ?? data.detail ?? "").trim() === keyBody
                ) {
                    await deleteDoc(doc(db, "undatedMessages", d.id));
                    break; // 最初の一致のみ削除
                }
            }
            setUndatedMessages((prev) =>
                prev.filter((m) => !(m.title?.trim() === keyTitle && bodyOfUndated(m) === keyBody))
            );
        }
    };

    const deletePastDatedMessage = async (index: number) => {
        const msg = pastDatedMessages[index];
        if (!msg) return;

        if (msg._docId) {
            await deleteDoc(doc(db, "pastDatedMessages", msg._docId));
        } else {
            const snap = await getDocs(pastDatedCol);
            const target = snap.docs.find(
                (d) => (d.data() as DatedMessage).notes === msg.notes
            );
            if (target) await deleteDoc(doc(db, "pastDatedMessages", target.id));
        }

        setPastDatedMessages((prev) => prev.filter((_, i) => i !== index));
    };

    const deletePastUndatedMessage = async (index: number) => {
        const msg = pastUndatedMessages[index];
        if (!msg) return;

        if (msg._docId) {
            await deleteDoc(doc(db, "pastUndatedMessages", msg._docId));
        } else {
            const snap = await getDocs(pastUndatedCol);
            const target = snap.docs.find((d) => {
                const data = d.data() as UndatedMessage;
                return (
                    data.title === msg.title &&
                    (data.notes ?? data.detail ?? "").trim() === bodyOfUndated(msg)
                );
            });
            if (target) await deleteDoc(doc(db, "pastUndatedMessages", target.id));
        }

        setPastUndatedMessages((prev) => prev.filter((_, i) => i !== index));
    };

    // 過去日付ありカードの一括削除（並列）
    const deletePastDatedGroup = async (date: string) => {
        const targets = pastDatedMessages.filter((m) => m.date === date);

        await Promise.all(
            targets.map((msg) => {
                if (msg._docId) {
                    return deleteDoc(doc(db, "pastDatedMessages", msg._docId));
                }
                return getDocs(pastDatedCol).then((snap) => {
                    const target = snap.docs.find((d) => (d.data() as DatedMessage).date === date);
                    if (target) return deleteDoc(doc(db, "pastDatedMessages", target.id));
                });
            })
        );

        setPastDatedMessages((prev) => prev.filter((m) => m.date !== date));
    };

    // アクティブな日付ありカードの一括削除（CardList 用・並列）
    const deleteDatedGroup = async (date: string) => {
        const targets = datedMessages.filter((m) => m.date === date);

        await Promise.all(
            targets.map((msg) => {
                if (msg._docId) {
                    return deleteDoc(doc(db, "datedMessages", msg._docId));
                }
                return getDocs(datedCol).then((snap) => {
                    const target = snap.docs.find((d) => {
                        const data = d.data() as DatedMessage;
                        return data.date === msg.date && data.title === msg.title && data.notes === msg.notes;
                    });
                    if (target) return deleteDoc(doc(db, "datedMessages", target.id));
                });
            })
        );

        setDatedMessages((prev) => prev.filter((m) => m.date !== date));
    };

    // ---------------------------------------------------
    // 復元
    // ---------------------------------------------------
    const restorePastDatedMessage = async (index: number) => {
        const msg = pastDatedMessages[index];
        if (!msg) return;

        const docRef = await addDoc(datedCol, omitDocId(msg));

        if (msg._docId) {
            await deleteDoc(doc(db, "pastDatedMessages", msg._docId));
        } else {
            const snap = await getDocs(pastDatedCol);
            const target = snap.docs.find(
                (d) => (d.data() as DatedMessage).notes === msg.notes
            );
            if (target) await deleteDoc(doc(db, "pastDatedMessages", target.id));
        }

        setDatedMessages((prev) => safeSort([...prev, { ...msg, _docId: docRef.id }]));
        setPastDatedMessages((prev) => prev.filter((_, i) => i !== index));
    };

    const restorePastUndatedMessage = async (index: number) => {
        const msg = pastUndatedMessages[index];
        if (!msg) return;

        const docRef = await addDoc(undatedCol, omitDocId(msg));

        if (msg._docId) {
            await deleteDoc(doc(db, "pastUndatedMessages", msg._docId));
        } else {
            const snap = await getDocs(pastUndatedCol);
            const target = snap.docs.find((d) => {
                const data = d.data() as UndatedMessage;
                return (
                    data.title === msg.title &&
                    (data.notes ?? data.detail) === (msg.notes ?? msg.detail)
                );
            });
            if (target) await deleteDoc(doc(db, "pastUndatedMessages", target.id));
        }

        setUndatedMessages((prev) => [...prev, { ...msg, _docId: docRef.id }]);
        setPastUndatedMessages((prev) => prev.filter((_, i) => i !== index));
    };

    // ---------------------------------------------------
    // Context に渡す値
    // ---------------------------------------------------
    const store: MessageStoreContextType = {
        datedMessages,
        undatedMessages,
        pastDatedMessages,
        pastUndatedMessages,

        addDatedMessage,
        addUndatedMessage,
        loadMessages,
        moveUndatedToPast,
        movePastDatedMessages,
        deletePastDatedMessage,
        deletePastUndatedMessage,
        deleteDatedMessage,
        deleteUndatedMessage,
        deletePastDatedGroup,
        deleteDatedGroup,
        moveOneDatedToPast,
        restorePastDatedMessage,
        restorePastUndatedMessage,
    };

    return (
        <MessageStoreContext.Provider value={store}>
            {children}
        </MessageStoreContext.Provider>
    );
}

export function useMessageStore() {
    const ctx = useContext(MessageStoreContext);
    if (!ctx) throw new Error("useMessageStore must be inside Provider");
    return ctx;
}
