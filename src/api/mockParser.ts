import type { ParsedMessage } from '../types/message'

/**
 * Gemini API を使わず、ダミーデータを返すモック関数（開発・テスト用）
 */
export async function parseMessageMock(text: string): Promise<ParsedMessage> {
    // 「○月○日」のような日付パターンを検出
    const datePattern = /\d{1,2}月\d{1,2}日/

    if (datePattern.test(text)) {
        return {
            type: "dated",
            date: "2025-09-30",
            grade: "2年生",
            title: "練習試合",
            place: "市民グラウンド",
            startTime: "09:00",
            endTime: "12:00",
            uniform: "青ユニフォーム",
            items: "水筒・タオル",
            notes: text,
        }
    } else {
        return {
            type: "undated",
            title: "クラブからのお知らせ",
            summary: "未定の予定について",
            detail: text,
        }
    }
}
