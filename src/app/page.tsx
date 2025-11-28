"use client";

import dynamicImport from "next/dynamic";

const HomePage = dynamicImport(() => import("../pages/HomePage"), {
  ssr: false,
});

export const dynamic = "force-dynamic";

export default function Page() {
  return <HomePage />;
}
