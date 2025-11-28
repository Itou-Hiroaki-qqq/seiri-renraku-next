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
} from "firebase/firestore";

// ------------------------------------------------------------
// Context 作成
// ------------------------------------------------------------

type MessageStoreContextType = ReturnType<typeof createMessageStore>;

const MessageStoreContext = createContext<MessageStoreContextType | null>(null);

export function MessageStoreProvider({ children }: { children: ReactNode }) {
    const store = createMessageStore();
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

function createMessageStore() {
    const [datedMessages, setDatedMessages] = useState<DatedMessage[]>([]);
    const [undatedMessages, setUndatedMessages] = useState<UndatedMessage[]>([]);
    const [pastDatedMessages, setPastDatedMessages] = useState<DatedMessage[]>([]);
    const [pastUndatedMessages, setPastUndatedMessages] = useState<UndatedMessage[]>([]);

    // Firestore collections
    const datedCol = collection(db, "datedMessages");
    const undatedCol = collection(db, "undatedMessages");
    const pastDatedCol = collection(db, "pastDatedMessages");
    const pastUndatedCol = collection(db, "pastUndatedMessages");

    const safeSort = (arr: DatedMessage[]) => {
        return arr.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
        });
    };

    // notes → detail の共通抽出
    const bodyOfUndated = (m: UndatedMessage): string =>
        (m.notes ?? m.detail ?? "").trim();

    const addDatedMessage = async (msg: DatedMessage) => {
        const updated = [...datedMessages, msg];
        safeSort(updated);
        setDatedMessages(updated);

        await addDoc(datedCol, msg);
    };

    const addUndatedMessage = async (msg: UndatedMessage) => {
        const updated = [...undatedMessages, msg];
        setUndatedMessages(updated);

        await addDoc(undatedCol, msg);
    };

    const loadMessages = async () => {
        // dated
        {
            const snap = await getDocs(datedCol);
            const arr = snap.docs.map((d: any) => {
                const data = d.data() as DatedMessage;
                return { ...data, notes: data.notes ?? "" };
            });
            safeSort(arr);
            setDatedMessages(arr);
        }

        // undated
        {
            const snap = await getDocs(undatedCol);
            const arr = snap.docs.map((d: any) => {
                const data = d.data() as any;
                return {
                    ...data,
                    notes: data.notes ?? "",
                    date: data.date ?? null,
                } as UndatedMessage;
            });
            setUndatedMessages(arr);
        }

        // past dated
        {
            const snap = await getDocs(pastDatedCol);
            const arr = snap.docs.map((d: any) => {
                const data = d.data() as DatedMessage;
                return { ...data, notes: data.notes ?? "" };
            });
            safeSort(arr);
            setPastDatedMessages(arr);
        }

        // past undated
        {
            const snap = await getDocs(pastUndatedCol);
            const arr = snap.docs.map((d: any) => {
                const data = d.data() as any;
                return {
                    ...data,
                    notes: data.notes ?? "",
                    date: data.date ?? null,
                } as UndatedMessage;
            });
            setPastUndatedMessages(arr);
        }
    };

    // ---------------------------------------------------
    // 日付なし → 過去倉庫
    // ---------------------------------------------------
    const moveUndatedToPast = async (index: number) => {
        const msg = undatedMessages[index];
        if (!msg) return;

        const updatedUndated = [...undatedMessages];
        updatedUndated.splice(index, 1);
        setUndatedMessages(updatedUndated);

        setPastUndatedMessages([...pastUndatedMessages, msg]);
        await addDoc(pastUndatedCol, msg);

        const snap = await getDocs(undatedCol);
        const target = snap.docs.find((d: any) => {
            const data = d.data() as UndatedMessage;
            return (
                data.title === msg.title &&
                bodyOfUndated(data) === bodyOfUndated(msg)
            );
        });

        if (target) {
            await deleteDoc(doc(db, "undatedMessages", target.id));
        }

        await loadMessages();
    };

    // ---------------------------------------------------
    // 日付あり → 過去倉庫（自動判定）
    // ---------------------------------------------------
    const movePastDatedMessages = async () => {
        const now = new Date();
        const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const today = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());

        const remaining: DatedMessage[] = [];

        for (const msg of datedMessages) {
            let msgDate: Date | null = null;

            if (msg.date && /^\d{4}-\d{2}-\d{2}$/.test(msg.date)) {
                const parts = msg.date.split("-").map(Number);
                msgDate = new Date(parts[0], parts[1] - 1, parts[2]);
            }

            if (!msgDate || msgDate >= today) {
                remaining.push(msg);
                continue;
            }

            // 過去扱い
            setPastDatedMessages((prev) => [...prev, msg]);
            await addDoc(pastDatedCol, msg);

            const snap = await getDocs(datedCol);
            const target = snap.docs.find(
                (d: any) => (d.data() as DatedMessage).notes === msg.notes
            );
            if (target) {
                await deleteDoc(doc(db, "datedMessages", target.id));
            }
        }

        setDatedMessages(remaining);
        await loadMessages();
    };

    // ---------------------------------------------------
    // 各種削除・復元処理
    // ---------------------------------------------------

    const deletePastDatedMessage = async (index: number) => {
        const msg = pastDatedMessages[index];
        if (!msg) return;

        const snap = await getDocs(pastDatedCol);
        const target = snap.docs.find(
            (d: any) => (d.data() as DatedMessage).notes === msg.notes
        );
        if (target) {
            await deleteDoc(doc(db, "pastDatedMessages", target.id));
        }

        const updated = [...pastDatedMessages];
        updated.splice(index, 1);
        setPastDatedMessages(updated);
    };

    const deletePastUndatedMessage = async (index: number) => {
        const msg = pastUndatedMessages[index];
        if (!msg) return;

        const snap = await getDocs(pastUndatedCol);
        const target = snap.docs.find((d: any) => {
            const data = d.data() as UndatedMessage;
            return (
                data.title === msg.title &&
                bodyOfUndated(data) === bodyOfUndated(msg)
            );
        });

        if (target) {
            await deleteDoc(doc(db, "pastUndatedMessages", target.id));
        }

        const updated = [...pastUndatedMessages];
        updated.splice(index, 1);
        setPastUndatedMessages(updated);
    };

    const deleteDatedMessage = async (msg: DatedMessage) => {
        setDatedMessages(
            datedMessages.filter(
                (m) =>
                    !(
                        m.date === msg.date &&
                        m.title === msg.title &&
                        m.notes === msg.notes
                    )
            )
        );

        const snap = await getDocs(datedCol);
        const target = snap.docs.find((d: any) => {
            const data = d.data() as DatedMessage;
            return (
                data.date === msg.date &&
                data.title === msg.title &&
                data.notes === msg.notes
            );
        });

        if (target) {
            await deleteDoc(doc(db, "datedMessages", target.id));
        }

        await loadMessages();
    };

    const deleteUndatedMessage = async (msg: UndatedMessage) => {
        const keyTitle = msg.title?.trim() ?? "";

        const snap = await getDocs(undatedCol);
        for (const d of snap.docs) {
            const data = d.data() as UndatedMessage;
            if (data.title?.trim() === keyTitle) {
                await deleteDoc(doc(db, "undatedMessages", d.id));
            }
        }

        setUndatedMessages(
            undatedMessages.filter((m) => m.title?.trim() !== keyTitle)
        );

        await loadMessages();
    };

    // 過去日付ありカードの一括削除
    const deletePastDatedGroup = async (date: string) => {
        // Firestore から該当日付の全ドキュメント削除
        const snap = await getDocs(pastDatedCol);

        for (const d of snap.docs) {
            const data = d.data() as DatedMessage;
            if (data.date === date) {
                await deleteDoc(doc(db, "pastDatedMessages", d.id));
            }
        }

        // React state から該当日付を除外
        setPastDatedMessages(
            pastDatedMessages.filter((m) => m.date !== date)
        );
    };

    const moveOneDatedToPast = async (msg: DatedMessage) => {
        setPastDatedMessages([...pastDatedMessages, msg]);
        await addDoc(pastDatedCol, msg);

        const snap = await getDocs(datedCol);
        const target = snap.docs.find((d: any) => {
            const data = d.data() as DatedMessage;
            return (
                data.date === msg.date &&
                data.title === msg.title &&
                data.notes === msg.notes
            );
        });

        if (target) {
            await deleteDoc(doc(db, "datedMessages", target.id));
        }

        setDatedMessages(
            datedMessages.filter(
                (m) =>
                    !(
                        m.date === msg.date &&
                        m.title === msg.title &&
                        m.notes === msg.notes
                    )
            )
        );

        await loadMessages();
    };

    const restorePastDatedMessage = async (index: number) => {
        const msg = pastDatedMessages[index];
        if (!msg) return;

        await addDoc(datedCol, msg);
        setDatedMessages([...datedMessages, msg]);

        const snap = await getDocs(pastDatedCol);
        const target = snap.docs.find(
            (d: any) => (d.data() as DatedMessage).notes === msg.notes
        );
        if (target) {
            await deleteDoc(doc(db, "pastDatedMessages", target.id));
        }

        const updated = [...pastDatedMessages];
        updated.splice(index, 1);
        setPastDatedMessages(updated);

        await loadMessages();
    };

    const restorePastUndatedMessage = async (index: number) => {
        const msg = pastUndatedMessages[index];
        if (!msg) return;

        await addDoc(undatedCol, msg);
        setUndatedMessages([...undatedMessages, msg]);

        const snap = await getDocs(pastUndatedCol);
        const target = snap.docs.find((d: any) => {
            const data = d.data() as UndatedMessage;
            return (
                data.title === msg.title &&
                (data.notes ?? data.detail) ===
                (msg.notes ?? msg.detail)
            );
        });

        if (target) {
            await deleteDoc(doc(db, "pastUndatedMessages", target.id));
        }

        const updated = [...pastUndatedMessages];
        updated.splice(index, 1);
        setPastUndatedMessages(updated);

        await loadMessages();
    };

    return {
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
        moveOneDatedToPast,
        restorePastDatedMessage,
        restorePastUndatedMessage,
    };
}
