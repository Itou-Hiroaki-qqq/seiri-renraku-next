import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Providers>
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
