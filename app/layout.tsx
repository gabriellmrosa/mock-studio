import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mockup Studio",
  description: "Editor de mockups com export transparente em PNG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
