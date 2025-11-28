"use client";

import "./globals.css";
import { ReactNode, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { ensureSignedInAnonymously } from "../firebase";

import Header from "../components/Header";
import Footer from "../components/Footer";

import { useMessageStore } from "../stores/messageStore";
import { Providers } from "./providers";
import { usePathname } from "next/navigation";

function LayoutEffectWrapper() {
  const messageStore = useMessageStore();
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      try {
        await ensureSignedInAnonymously();

        await messageStore.loadMessages();

        // @ts-ignore
        window.firebaseAuth = getAuth();
      } catch (e) {
        console.error("Anonymous sign-in failed:", e);
        alert("認証に失敗しました。ページを再読み込みしてください。");
      }
    })();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <LayoutEffectWrapper />
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="grow p-4">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
