import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./vinyl.css";
import "./cream.css";
import "./portal.css";
import "./about.css";
import "./loader.css";
import "./resume.css";
import "./responsive.css";
import SiteShell from "@/components/SiteShell";

const tanker = localFont({
  src: "./fonts/Tanker-Regular.otf",
  variable: "--font-tanker",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

const pally = localFont({
  src: [
    { path: "./fonts/Pally-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/Pally-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/Pally-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-pally",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
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
    <html lang="en" className={`${tanker.variable} ${pally.variable}`}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
