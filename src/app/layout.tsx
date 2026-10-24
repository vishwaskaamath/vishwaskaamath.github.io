import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vishwas Kamath — Motion, Film & Digital Experiences",
  description:
    "Selected work by Vishwas Kamath. Motion graphics, video editing, and digital design. Made to move you.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
