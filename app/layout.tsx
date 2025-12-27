import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowthSpark Media Assistant",
  description: "WhatsApp style AI sales & consultation assistant for digital marketing agency"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
