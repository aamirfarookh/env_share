import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnvShare • Zero-Knowledge E2EE Secret Sharing",
  description:
    "Share .env files and API secrets securely across the internet. End-to-end encrypted with AES-256-GCM. Decryption keys never touch the server.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#080c14] text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
