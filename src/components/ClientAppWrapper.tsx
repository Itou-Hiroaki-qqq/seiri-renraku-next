"use client";

import { useEffect } from "react";
import { useMessageStore } from "../stores/messageStore";
import { ensureSignedInAnonymously } from "../firebase";

export default function ClientAppWrapper() {
    const messageStore = useMessageStore();

    useEffect(() => {
        (async () => {
            try {
                await ensureSignedInAnonymously();
                await messageStore.loadMessages();
            } catch (e) {
                console.error("Anonymous sign-in failed:", e);
                alert("認証に失敗しました。ページを再読み込みしてください。");
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 初回マウント時のみ実行

    return null;
}
