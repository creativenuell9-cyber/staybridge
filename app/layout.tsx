import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayBridge Hospitality",
  description:
    "Premium hospitality marketplace connecting travelers to trusted accommodation and exceptional hospitality partners in Nigeria.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
