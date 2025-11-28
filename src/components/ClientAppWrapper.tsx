"use client";

import { useEffect } from "react";
import { useMessageStore } from "../stores/messageStore";
import { getAuth } from "firebase/auth";
import { ensureSignedInAnonymously } from "../firebase";

export default function ClientAppWrapper() {
    const messageStore = useMessageStore();

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

    return null; // 表示するUIがないので null でOK
}
