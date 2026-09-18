import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UNO — play with friends",
  description:
    "A fast, no-signup multiplayer UNO table. Create a room, share the code, and play with friends or bots.",
  openGraph: {
    title: "UNO — play with friends",
    description: "Create a room, share the code, play in seconds. No signup.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04140f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
