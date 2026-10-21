import type { Metadata } from "next";
import { Abhaya_Libre } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import PwaRegistration from "./components/PwaRegistration";
import "./globals.css";

const abhayaLibre = Abhaya_Libre({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: "800",
});

export const metadata: Metadata = {
  title: "Mock Studio",
  description: "Editor de mockups com export transparente em PNG",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme="dark">
      {/* Nas gravações do Clarity, todo texto sai mascarado: nomes de
          objetos, templates e arquivos são do usuário. */}
      <body className={abhayaLibre.variable} data-clarity-mask="True">
        {children}
        <PwaRegistration />
        <Analytics />
      </body>
    </html>
  );
}
