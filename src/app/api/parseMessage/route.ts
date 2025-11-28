// src/app/api/parseMessage/route.ts

import { NextResponse } from "next/server";

export async function POST(req: Request) {
    // ★★後削除
    console.log("✅ route.ts の POST 関数が呼ばれました");
    try {
        const { prompt } = await req.json();
        // ★★後削除
        console.log("送信前:", prompt);

        const response = await fetch(
            "https://asia-northeast1-seiri-renraku-next-31ac1.cloudfunctions.net/parseMessage",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: prompt }),
            }
        );

        // ★★後削除
        console.log("送信後:", response.status);

        if (!response.ok) {
            console.error("Cloud Functions API error:", response.statusText);
            return NextResponse.json({ error: "Cloud Functions error" }, { status: 500 });
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (e) {
        console.error("API route error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
