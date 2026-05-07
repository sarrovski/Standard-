import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Standard | Trusted Gaming Tool Marketplace",
  description:
    "Discover real gaming tool references, compare seller trust, payment methods, reseller offers, and verified product facts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
