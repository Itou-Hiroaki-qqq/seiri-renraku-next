"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
    const [isNavOpen, setIsNavOpen] = useState(false);

    const toggleNav = () => {
        setIsNavOpen(!isNavOpen);
    };

    return (
        <>
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                {/* 左側：アプリタイトル */}
                <h1 className="text-xl font-bold text-gray-800">整理して連絡くん</h1>

                {/* 右側：三本線ボタン */}
                <button onClick={toggleNav} className="text-2xl">
                    &#9776;
                </button>
            </header>

            {/* オーバーレイ（半透明の黒背景） */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                onClick={toggleNav}
            ></div>

            {/* サイドメニュー（常に描画し、スライドで制御） */}
            <aside
                className={`fixed top-0 right-0 w-64 h-full bg-white shadow-lg z-50 p-4 transform transition-transform duration-300 ${isNavOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <button className="text-xl mb-4" onClick={toggleNav}>
                    ×
                </button>

                <nav className="flex flex-col space-y-4">
                    <Link href="/" className="text-blue-600 hover:underline" onClick={toggleNav}>
                        トップ
                    </Link>
                    <Link href="/past-dated" className="text-blue-600 hover:underline" onClick={toggleNav}>
                        過去の日程あり倉庫
                    </Link>
                    <Link href="/past-undated" className="text-blue-600 hover:underline" onClick={toggleNav}>
                        過去の日程なし倉庫
                    </Link>
                </nav>
            </aside>
        </>
    );
}
