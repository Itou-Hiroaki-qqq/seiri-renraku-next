"use client";

import { useState } from "react";
import { useMessageStore } from "../stores/messageStore";
import type { ParsedMessage, UndatedMessage } from "../types/message";
import { callParseMessage } from "../api/gemini";

export default function InputForm() {
    const [inputText, setInputText] = useState("");
    const messageStore = useMessageStore();

    /**
     * Gemini API 経由の整理ボタン処理
     */
    const handleSubmit = async () => {
        if (inputText.trim() === "") {
            alert("入力してください！");
            return;
        }

        try {
            const parsed: ParsedMessage = await callParseMessage(inputText);

            if (parsed.type === "dated") {
                await messageStore.addDatedMessage(parsed);
            } else {
                await messageStore.addUndatedMessage(parsed);
            }

            alert("整理完了！（Gemini API 経由）");
            setInputText("");
        } catch (e) {
            console.error("Gemini API 呼び出し失敗:", e);
            alert("解析に失敗しました");
        }
    };

    /**
     * 手動で「日付なしカード」を直接追加
     */
    const addUndatedManually = async () => {
        const raw = inputText.trim();
        if (!raw) {
            alert("入力してください！");
            return;
        }

        // 先頭行をタイトルに使用
        const lines = raw.split("\n").filter(Boolean);
        const title = (lines[0] ?? "タイトル未設定").slice(0, 60);
        const detail = raw;
        const summary = detail.length > 60 ? detail.slice(0, 60) + "…" : detail;

        // Firestore ルール適合の完全フィールド構成
        const payload: UndatedMessage & {
            type: "undated";
            date: null;
            grade: null;
            place: null;
            startTime: null;
            endTime: null;
            uniform: null;
            items: null;
        } = {
            title,
            summary,
            detail,
            notes: detail,
            type: "undated",
            date: null,
            grade: null,
            place: null,
            startTime: null,
            endTime: null,
            uniform: null,
            items: null,
        };

        try {
            await messageStore.addUndatedMessage(payload);
            alert("日付なしカードとして追加しました！");
            setInputText("");
        } catch (err) {
            console.error("Firestore 書き込みエラー:", err);
            alert("Firestoreへの保存に失敗しました（権限エラーの可能性）");
        }
    };

    return (
        <div className="p-4 bg-white shadow-md rounded-lg max-w-2xl mx-auto mt-6">
            <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-2"
            >
                連絡事項を入力してください
            </label>

            <textarea
                id="message"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ここに連絡事項を貼り付け..."
            ></textarea>

            <div className="flex flex-wrap gap-3">
                {/* Gemini API 経由 */}
                <button
                    onClick={handleSubmit}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    整理（Gemini）
                </button>

                {/* 手動で日付なしカード追加 */}
                <button
                    onClick={addUndatedManually}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
                >
                    日付なしカードで追加
                </button>
            </div>
        </div>
    );
}
