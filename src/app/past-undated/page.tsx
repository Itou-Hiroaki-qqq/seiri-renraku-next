"use client";

import { useEffect, useMemo } from "react";
import { useMessageStore } from "../../stores/messageStore";
import type { UndatedWithId } from "../../stores/messageStore";

type UndatedGroup = {
    date: string;
    messages: UndatedWithId[];
};

export default function PastUndatedPage() {
    const messageStore = useMessageStore();

    // Firestore 読み込み（直接遷移した場合に備えて）
    useEffect(() => {
        messageStore.loadMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 日付ごとにグループ化（降順）
    const groupedPastUndated = useMemo((): UndatedGroup[] => {
        const grouped: Record<string, UndatedWithId[]> = {};

        for (const msg of messageStore.pastUndatedMessages) {
            const dateKey = msg.date ?? "日付不明";
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(msg);
        }

        const sortedDates = Object.keys(grouped).sort((a, b) => {
            if (a === "日付不明") return 1;
            if (b === "日付不明") return -1;
            return b.localeCompare(a);
        });

        return sortedDates.map((date) => ({
            date,
            messages: grouped[date],
        }));
    }, [messageStore.pastUndatedMessages]);

    // 削除処理（_docId で照合）
    const deleteMessage = async (msg: UndatedWithId) => {
        if (!confirm("本当に削除しますか？")) return;

        const idx = messageStore.pastUndatedMessages.findIndex((m) =>
            msg._docId ? m._docId === msg._docId : (m.title === msg.title && (m.notes ?? m.detail) === (msg.notes ?? msg.detail))
        );

        if (idx >= 0) {
            await messageStore.deletePastUndatedMessage(idx);
            alert("削除しました");
        }
    };

    // 元に戻す処理（_docId で照合）
    const restoreMessage = async (msg: UndatedWithId) => {
        if (!confirm("この連絡をトップページに戻しますか？")) return;

        const idx = messageStore.pastUndatedMessages.findIndex((m) =>
            msg._docId ? m._docId === msg._docId : (m.title === msg.title && (m.notes ?? m.detail) === (msg.notes ?? msg.detail))
        );

        await messageStore.restorePastUndatedMessage(idx);
        alert("トップページに戻しました！");
    };

    return (
        <div className="max-w-3xl mx-auto mt-6 space-y-8">
            <h2 className="text-xl font-bold mb-4">過去の日程なし連絡倉庫</h2>

            {messageStore.pastUndatedMessages.length === 0 ? (
                <p className="text-gray-500 text-center">データはありません</p>
            ) : (
                groupedPastUndated.map((group: UndatedGroup) => (
                    <div
                        key={group.date}
                        className="bg-white border-2 border-gray-300 shadow-md rounded-xl p-5 hover:shadow-lg hover:border-gray-400 transition"
                    >
                        <h2 className="text-2xl font-extrabold text-gray-800 mb-4 border-b-2 border-gray-200 pb-1">
                            {group.date ?? "日付不明"}
                        </h2>

                        {group.messages.map((msg: UndatedWithId) => (
                            <div
                                key={msg._docId ?? `${msg.title}-${msg.date}`}
                                className="border border-gray-200 rounded-lg p-4 mt-2 bg-gray-50 hover:bg-gray-100 transition"
                            >
                                <h3 className="font-bold text-lg">{msg.title}</h3>

                                {msg.summary && (
                                    <p className="text-gray-700 mt-2">
                                        <strong>概要:</strong> {msg.summary}
                                    </p>
                                )}

                                {msg.detail && (
                                    <details className="mt-3 border-t border-gray-200 pt-2">
                                        <summary className="cursor-pointer text-blue-600 font-medium">
                                            詳細を見る
                                        </summary>
                                        <p className="text-gray-700 mt-2 whitespace-pre-line">
                                            {msg.detail}
                                        </p>
                                    </details>
                                )}

                                <div className="mt-4 flex gap-3">
                                    <button
                                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                                        onClick={() => deleteMessage(msg)}
                                    >
                                        削除する
                                    </button>

                                    <button
                                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                                        onClick={() => restoreMessage(msg)}
                                    >
                                        元に戻す
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}
