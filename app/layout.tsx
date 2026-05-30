import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "V2C AI Guided Commerce",
  description: "AI shopping decision layer with guided narrowing and clean search flow"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
