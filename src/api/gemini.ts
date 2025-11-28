"use client";

import type { ParsedMessage } from "../types/message";

// Vercelデプロイ後も安全なNext.js API経由のURL
const URL = "/api/parseMessage";

export const callParseMessage = async (text: string): Promise<ParsedMessage> => {
    const response = await fetch(URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: text }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("API Error:", err);
        throw new Error("API request failed");
    }

    return response.json();
};
