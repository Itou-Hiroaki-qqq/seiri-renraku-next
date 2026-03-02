import { NextResponse } from "next/server";

const CLOUD_FUNCTIONS_URL = process.env.CLOUD_FUNCTIONS_PARSE_URL;

export async function POST(req: Request) {
    if (!CLOUD_FUNCTIONS_URL) {
        console.error("CLOUD_FUNCTIONS_PARSE_URL is not set");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    try {
        const { prompt } = await req.json();

        const response = await fetch(CLOUD_FUNCTIONS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });

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
