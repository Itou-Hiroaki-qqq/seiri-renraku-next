export type GradeType = '2年生' | '4年生' | '全体';

export interface DatedMessage {
    date: string;                 // YYYY-MM-DD
    grade: GradeType | null;
    title: string;
    place: string | null;
    startTime: string | null;
    endTime: string | null;
    uniform: string | null;
    items: string | null;
    notes: string | null;         // 本文・全文
}

export interface UndatedMessage {
    title: string;
    summary?: string | null;      // 概要
    detail?: string | null;       // 全文
    notes?: string | null;        // サーバから来る場合に備えて許容
    date?: string | null;         // ある場合は YYYY-MM-DD、無ければ null/未定義
    // Firestore セキュリティルール対応フィールド（null のみ許容）
    type?: "undated" | null;
    grade?: GradeType | null;
    place?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    uniform?: string | null;
    items?: string | null;
}

export type ParsedMessage =
    | ({ type: "dated" } & DatedMessage)
    | ({ type: "undated" } & UndatedMessage);
