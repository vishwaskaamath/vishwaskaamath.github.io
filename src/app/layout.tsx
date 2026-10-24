import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const tanker = localFont({
  src: "./fonts/Tanker-Regular.otf",
  variable: "--font-tanker",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Vishwas Kamath — Motion, Film & Digital Experiences",
  description:
    "Selected work by Vishwas Kamath. Motion graphics, video editing, and digital design. Made to move you.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={tanker.variable}>
      <body>{children}</body>
    </html>
  );
}
