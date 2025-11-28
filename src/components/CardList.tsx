"use client";

import { useEffect, useMemo } from "react";
import { useMessageStore } from "../stores/messageStore";
import type { DatedMessage, UndatedMessage } from "../types/message";

export default function CardList() {
    const messageStore = useMessageStore();

    // 日付ありメッセージのグループ化
    const groupedByDate = useMemo(() => {
        const grouped: Record<string, any> = {};

        for (const msg of messageStore.datedMessages) {
            if (!grouped[msg.date]) {
                grouped[msg.date] = {
                    date: msg.date,
                    "2年生": [],
                    "4年生": [],
                    "全体": [],
                };
            }

            const gradeKey = msg.grade ?? "全体";
            grouped[msg.date][gradeKey].push(msg);
        }

        // 昇順ソート
        return Object.values(grouped).sort((a, b) =>
            a.date.localeCompare(b.date)
        );
    }, [messageStore.datedMessages]);

    // 日付なし → 過去倉庫へ移動
    const confirmUndated = (index: number) => {
        messageStore.moveUndatedToPast(index);
        alert("「過去の日程なし連絡倉庫」に移動しました！");
    };

    // 日付なし削除
    const deleteUndated = async (msg: UndatedMessage) => {
        if (confirm("本当に削除しますか？")) {
            await messageStore.deleteUndatedMessage(msg);
            alert("削除しました");
        }
    };

    // 日付あり削除
    const deleteDated = async (msg: DatedMessage) => {
        if (confirm("本当に削除しますか？")) {
            await messageStore.deleteDatedMessage(msg);
            alert("削除しました");
        }
    };

    // 過去倉庫へ移動
    const moveToPast = async (msg: DatedMessage) => {
        if (confirm("このカードを過去倉庫へ移動しますか？")) {
            await messageStore.moveOneDatedToPast(msg);
            alert("「過去の日程あり連絡倉庫」に移動しました！");
        }
    };

    // 日付ごと削除処理
    const deleteWholeDateGroup = async (date: string) => {
        if (confirm(`日付 ${date} の全ての連絡を削除しますか？`)) {
            const targets = messageStore.datedMessages.filter(
                (m: any) => m.date === date
            );

            for (const msg of targets) {
                await messageStore.deleteDatedMessage(msg);
            }

            alert(`日付 ${date} の全てのカードを削除しました。`);
        }
    };

    // Vue: onMounted(() => messageStore.movePastDatedMessages())
    useEffect(() => {
        messageStore.movePastDatedMessages();
    }, []);

    return (
        <div className="max-w-3xl mx-auto mt-6 space-y-6">
            {/* 日付なし連絡 */}
            {messageStore.undatedMessages.map((msg: any, i: number) => (
                <div
                    key={`u-${i}`}
                    className="bg-yellow-50 shadow rounded-lg p-4"
                >
                    <h2 className="font-bold text-lg">{msg.title}</h2>

                    {msg.summary && (
                        <p className="text-gray-700 mt-2">
                            <strong>概要:</strong> {msg.summary}
                        </p>
                    )}

                    {msg.detail && (
                        <details className="mt-3">
                            <summary className="cursor-pointer text-blue-600">
                                詳細を見る
                            </summary>
                            <p className="text-gray-600 mt-2 whitespace-pre-line">
                                {msg.detail}
                            </p>
                        </details>
                    )}

                    <div className="mt-3">
                        <button
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                            onClick={() => confirmUndated(i)}
                        >
                            確認した
                        </button>

                        <button
                            className="ml-2 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            onClick={() => deleteUndated(msg)}
                        >
                            削除する
                        </button>
                    </div>
                </div>
            ))}

            {/* 日付あり連絡 */}
            {groupedByDate.map((dateGroup: any, index: number) => (
                <div
                    key={index}
                    className="bg-white shadow-lg rounded-lg p-4 border border-gray-300 relative"
                >
                    <h2 className="text-2xl font-extrabold text-gray-800 mb-4 border-b pb-1">
                        {dateGroup.date}
                    </h2>

                    {/* 学年ごと */}
                    {["2年生", "4年生", "全体"].map((grade) => (
                        <div key={grade} className="mb-4">
                            <h3 className="font-semibold text-gray-700">
                                {grade}への連絡
                            </h3>

                            {dateGroup[grade].length === 0 && (
                                <div className="text-gray-400 text-sm">（なし）</div>
                            )}

                            {dateGroup[grade].map((msg: any, i: number) => (
                                <div
                                    key={i}
                                    className="border rounded p-3 mt-2 bg-gray-50"
                                >
                                    <p>
                                        <strong>タイトル:</strong> {msg.title}
                                    </p>
                                    {msg.place && (
                                        <p>
                                            <strong>会場:</strong> {msg.place}
                                        </p>
                                    )}
                                    {msg.startTime && (
                                        <p>
                                            <strong>集合:</strong> {msg.startTime}
                                        </p>
                                    )}
                                    {msg.endTime && (
                                        <p>
                                            <strong>解散:</strong> {msg.endTime}
                                        </p>
                                    )}
                                    {msg.uniform && (
                                        <p>
                                            <strong>ユニフォーム:</strong> {msg.uniform}
                                        </p>
                                    )}
                                    {msg.items && (
                                        <p>
                                            <strong>持ち物:</strong> {msg.items}
                                        </p>
                                    )}

                                    {msg.notes && (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-blue-600">
                                                詳細を見る
                                            </summary>
                                            <p className="text-gray-600 mt-1 whitespace-pre-line">
                                                {msg.notes}
                                            </p>
                                        </details>
                                    )}

                                    <div className="mt-3">
                                        <button
                                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                            onClick={() => deleteDated(msg)}
                                        >
                                            削除する
                                        </button>

                                        <button
                                            className="ml-2 bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                                            onClick={() => moveToPast(msg)}
                                        >
                                            過去倉庫へ移動
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* 日付ごと削除ボタン */}
                    <div className="text-right mt-6 border-t pt-3">
                        <button
                            className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800"
                            onClick={() => deleteWholeDateGroup(dateGroup.date)}
                        >
                            この日付のカードをすべて削除
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
