import * as functions from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import corsLib from "cors";
import express from "express";

const GEMINI_KEY = defineSecret("GOOGLE_GENAI_API_KEY");

const app = express();
const cors = corsLib({ origin: true });

app.use(cors);
app.use(express.json());

function toISO(y: number, m: number, d: number): string {
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}

function extractFirstISODate(src: string): string | null {
    const currentYear = new Date().getFullYear();

    const m1 = src.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m1) return toISO(+m1[1], +m1[2], +m1[3]);

    const m2 = src.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    if (m2) return toISO(currentYear, +m2[1], +m2[2]);

    const m3 = src.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (m3) return toISO(currentYear, +m3[1], +m3[2]);

    const m4 = src.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*[-〜～—]/);
    if (m4) return toISO(currentYear, +m4[1], +m4[2]);

    const m5 = src.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日.*?[-〜～—]/);
    if (m5) return toISO(currentYear, +m5[1], +m5[2]);

    return null;
}

app.post("/", async (req, res) => {
    const apiKey = GEMINI_KEY.value();

    logger.info("📝 Received body:", req.body);

    const userText = String(req.body?.prompt ?? "");

    if (!userText) {
        return res.status(400).json({ error: "Missing 'prompt' in request body" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
あなたはサッカークラブの連絡事項を整理するアシスタントです。
以下の日本語テキストを JSON に変換してください。

ルール:
- 単一日付があれば type="dated" で date は YYYY-MM-DD。
- 期間 (例: 10/5-10/26) の場合は開始日を date に入れる。
- 年が書かれていない場合は「現在の年（${new Date().getFullYear()}年）」を補ってください。
- 日付が特定できない場合は type="undated" にする。
- "dated" で date=null は禁止。必ず補完するか "undated" に落とす。
- grade は "2年生"|"4年生"|"全体" のいずれか。不明なら null。
- 出力は JSON のみ。

出力スキーマ:
{
  "type": "dated" | "undated",
  "date": "YYYY-MM-DD" | null,
  "grade": "2年生" | "4年生" | "全体" | null,
  "title": string,
  "place": string | null,
  "startTime": string | null,
  "endTime": string | null,
  "uniform": string | null,
  "items": string | null,
  "notes": string | null,
  "summary": string | null,
  "detail": string | null
}

重要な指示:
- type が "dated" の場合、notes に全文をそのまま入れる。
- type が "undated" の場合、summary に要約、detail に全文。
- 出力は JSON のみ。

入力:
${userText}
  `;

    let raw = "";
    try {
        const result = await model.generateContent(prompt);
        raw = result.response.text().trim();
        logger.info("Gemini raw response:", raw);
    } catch (e) {
        logger.error("generateContent failed:", e);
        return res.status(500).json({ error: "Gemini API request failed" });
    }

    const cleanedRaw = raw
        .replace(/^```json/, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();

    const jsonMatch = cleanedRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        return res.status(400).json({ error: "No JSON found in Gemini response" });
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]);
        const isoOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

        if (parsed.type === "dated" && (!parsed.date || !isoOk(parsed.date))) {
            const iso = extractFirstISODate(userText);
            if (iso) {
                parsed.date = iso;
            } else {
                parsed.type = "undated";
                parsed.date = null;
            }
        }

        if (parsed.type === "undated") {
            parsed.date = null;
            parsed.summary = parsed.summary ?? (userText.length <= 60 ? userText : userText.slice(0, 60) + "…");
            parsed.detail = parsed.detail ?? userText;
        }

        if (parsed.type === "dated") {
            parsed.notes = userText;
        }

        logger.info("Parsed JSON:", parsed);
        return res.status(200).json(parsed);
    } catch (e) {
        logger.error("JSON parse error:", raw);
        return res.status(400).json({ error: "JSON parse error" });
    }
});

export const parseMessage = functions.onRequest(
    { region: "asia-northeast1", secrets: [GEMINI_KEY] },
    app
);
