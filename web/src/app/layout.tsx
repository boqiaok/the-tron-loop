import type { Metadata } from "next";
import { Geist_Mono, Newsreader, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: "italic",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "The Tron Loop",
    template: "%s | The Tron Loop",
  },
  description: "A weekly guide to events and activities around Hamilton.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background">{children}</body>
    </html>
  );
}
