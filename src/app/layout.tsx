import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Standard | Trusted Gaming Tool Marketplace",
  description:
    "Discover real gaming tool products, compare seller trust, verified payment methods, and product facts.",
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
