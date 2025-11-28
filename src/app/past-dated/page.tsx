"use client";

import { useEffect, useMemo } from "react";
import { useMessageStore } from "../../stores/messageStore";
import type { DatedMessage } from "../../types/message";

export default function PastDatedPage() {
    const messageStore = useMessageStore();

    // Firestore読み込み（Vue: onMounted）
    useEffect(() => {
        messageStore.loadMessages();
    }, []);

    // 日付ごとに学年別でグルーピング（降順）
    const groupedPast = useMemo(() => {
        const grouped: Record<string, any> = {};

        for (const msg of messageStore.pastDatedMessages) {
            const dateKey = msg.date ?? "日付不明";

            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    date: dateKey,
                    "2年生": [],
                    "4年生": [],
                    "全体": [],
                };
            }

            const gradeKey = msg.grade ?? "全体";
            grouped[dateKey][gradeKey].push(msg);
        }

        // 日付を降順にソート）
        return Object.values(grouped).sort((a, b) =>
            b.date.localeCompare(a.date)
        );
    }, [messageStore.pastDatedMessages]);

    // 個別削除
    const handleDelete = async (index: number, grade: string, date: string) => {
        const group = groupedPast.find((g) => g.date === date);
        const msg = group?.[grade]?.[index];
        if (!msg) return;

        if (confirm("本当に削除しますか？")) {
            const idx = messageStore.pastDatedMessages.findIndex(
                (m: any) =>
                    m.date === msg.date &&
                    m.title === msg.title &&
                    m.notes === msg.notes
            );
            if (idx >= 0) {
                await messageStore.deletePastDatedMessage(idx);
                alert("削除しました");
            }
        }
    };

    // 元に戻す処理
    const restoreMessage = async (msg: DatedMessage) => {
        if (confirm("この連絡をトップページに戻しますか？")) {
            const idx = messageStore.pastDatedMessages.findIndex(
                (m: any) =>
                    m.date === msg.date &&
                    m.title === msg.title &&
                    m.notes === msg.notes
            );

            await messageStore.restorePastDatedMessage(idx);
            alert("トップページに戻しました！");
        }
    };

    // 日付ごと削除処理
    const deleteWholeDateGroup = async (date: string) => {
        if (!confirm(`日付 ${date} の全ての連絡を削除しますか？`)) return;

        await messageStore.deletePastDatedGroup(date);

        alert(`日付 ${date} の全てのカードを削除しました！`);
    };


    return (
        <div className="max-w-3xl mx-auto mt-6 space-y-8">
            <h2 className="text-xl font-bold mb-4">過去の日程あり連絡倉庫</h2>

            {groupedPast.length === 0 ? (
                <p className="text-gray-500 text-center">データはありません</p>
            ) : (
                // 日付ごとにグルーピングして表示
                groupedPast.map((dateGroup: any, index: number) => (
                    <div
                        key={index}
                        className="bg-white border-2 border-gray-300 shadow-md rounded-xl p-5 hover:shadow-lg hover:border-gray-400 transition"
                    >
                        {/* 日付 */}
                        <h2 className="text-2xl font-extrabold text-gray-800 mb-4 border-b-2 border-gray-200 pb-1">
                            {dateGroup.date}
                        </h2>

                        {/* 学年別 */}
                        {["2年生", "4年生", "全体"].map((grade) => (
                            <div key={grade} className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    {grade}への連絡
                                </h3>

                                {/* （なし） */}
                                {dateGroup[grade].length === 0 && (
                                    <div className="text-gray-400 text-sm mb-2">（なし）</div>
                                )}

                                {/* 各メッセージ */}
                                {dateGroup[grade].map((msg: any, i: number) => (
                                    <div
                                        key={i}
                                        className="border border-gray-200 rounded-lg p-4 mt-2 bg-gray-50 hover:bg-gray-100 transition"
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

                                        {/* 詳細（<details>） */}
                                        {msg.notes && (
                                            <details className="mt-3 border-t border-gray-200 pt-2">
                                                <summary className="cursor-pointer text-blue-600 font-medium">
                                                    詳細を見る
                                                </summary>
                                                <p className="text-gray-700 mt-2 whitespace-pre-line">
                                                    {msg.notes}
                                                </p>
                                            </details>
                                        )}

                                        {/* ボタン */}
                                        <div className="mt-4 flex gap-3">
                                            <button
                                                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                                                onClick={() =>
                                                    handleDelete(i, grade, dateGroup.date)
                                                }
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
                        ))}

                        {/* 日付全体削除 */}
                        <div className="text-right mt-6 border-t pt-3">
                            <button
                                className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 transition"
                                onClick={() => deleteWholeDateGroup(dateGroup.date)}
                            >
                                この日付のカードをすべて削除
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
