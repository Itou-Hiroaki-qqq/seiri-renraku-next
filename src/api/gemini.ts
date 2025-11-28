"use client";

import type { ParsedMessage } from "../types/message";

const URL =
    "https://asia-northeast1-seiri-renraku-next-31ac1.cloudfunctions.net/parseMessage";

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
        console.error("Cloud Functions Error:", err);
        throw new Error("Cloud Functions request failed");
    }

    return response.json() as Promise<ParsedMessage>;
};
