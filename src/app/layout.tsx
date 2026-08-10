import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOPLINE ODC - Premium Hospitality Staffing Solutions",
  description: "Deploy dependable, pre-screened student workforces for premium events, catering, resorts, and hotels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
