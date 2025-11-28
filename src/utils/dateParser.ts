// 日付文字列を "YYYY-MM-DD" に正規化。見つからなければ null
export const parseJapaneseDate = (rawText: string, baseDate = new Date()): string | null => {
    const text = toHalfWidth(rawText);

    // 0) 和暦: 令和/平成/昭和
    const era = text.match(/(令和|平成|昭和)\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (era) {
        const year = eraToAD(era[1]!, Number(era[2]!));
        if (year) return `${year}-${pad2(era[3]!)}-${pad2(era[4]!)}`;
    }

    // 1) 西暦 + 区切り: 2025/10/05, 2025-10-05, 2025.10.5, 2025年10月5日
    const ymd1 = text.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if (ymd1) return `${ymd1[1]!}-${pad2(ymd1[2]!)}-${pad2(ymd1[3]!)}`;

    const ymdKanji = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (ymdKanji) return `${ymdKanji[1]!}-${pad2(ymdKanji[2]!)}-${pad2(ymdKanji[3]!)}`;

    // 2) 和文: 10月20日（曜日表記は任意/全角OK）
    const jp = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s*(?:\(|（)[^)）]*(?:\)|）))?/);
    if (jp) {
        const y = baseDate.getFullYear();
        return `${y}-${pad2(jp[1]!)}-${pad2(jp[2]!)}`;
    }

    // 3) 欧文省略: 10/20, 10-20, 10.20, 7/1(日) など（後ろに数字が続かない）
    const md = text.match(/(\d{1,2})[\/\-.](\d{1,2})(?!\d)/);
    if (md) {
        const y = baseDate.getFullYear();
        return `${y}-${pad2(md[1]!)}-${pad2(md[2]!)}`;
    }

    // 4) 2桁年: 25/10/05, 25-7-1 → 2000-2099として解釈
    const y2md = text.match(/(\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if (y2md) {
        const y = 2000 + Number(y2md[1]!);
        return `${y}-${pad2(y2md[2]!)}-${pad2(y2md[3]!)}`;
    }

    return null;
};

// 全角→半角・記号ゆらぎの正規化
export const toHalfWidth = (s: string): string => {
    return s
        .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // 全角数字→半角
        .replace(/[－―ー–]/g, "-")     // ダッシュ類→-
        .replace(/[／⁄]/g, "/")        // 全角/特殊スラッシュ→/
        .replace(/（/g, "(").replace(/）/g, ")") // 全角カッコ→半角
        .replace(/\s+/g, " ")           // 連続空白→1つ
        .trim();
};

const pad2 = (v: string | number) => String(v).padStart(2, "0");

// 和暦→西暦
const eraToAD = (era: string, yearInEra: number): number | null => {
    const y = yearInEra <= 0 ? 1 : yearInEra;
    if (era === "令和") return 2018 + y;  // 令和1年=2019
    if (era === "平成") return 1988 + y;  // 平成1年=1989
    if (era === "昭和") return 1925 + y;  // 昭和1年=1926
    return null;
};
