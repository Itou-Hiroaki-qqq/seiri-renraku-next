"use client";

import { ReactNode } from "react";
import { MessageStoreProvider } from "../stores/messageStore"; 

export function Providers({ children }: { children: ReactNode }) {
  return <MessageStoreProvider>{children}</MessageStoreProvider>;
}
