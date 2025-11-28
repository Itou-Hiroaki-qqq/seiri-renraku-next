"use client";

import dynamic from "next/dynamic";

// HomePage を動的読み込み (SSR を無効化)
const HomePage = dynamic(() => import("../pages/HomePage"), {
  ssr: false, // プリレンダリングを防ぐ
});

export default function Page() {
  return <HomePage />;
}
