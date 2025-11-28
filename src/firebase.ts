"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export { app };

export const auth = getAuth(app);
export const db = getFirestore(app);

// =============================
// 匿名ログイン
// =============================
export async function ensureSignedInAnonymously(): Promise<void> {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user: any) => {
            try {
                if (!user) {
                    await signInAnonymously(auth);
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
}
