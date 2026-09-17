import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

// Self-hosted Geist via the `geist` package (no Google Fonts round-trip,
// works offline / behind proxies). Variables keep the same names so
// globals.css needs no changes.
const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "SocialPilot — Social Media Management Platform",
  description: "Auto post, schedule, engage, and grow across all social media platforms. The ultimate social media management tool.",
  keywords: ["Social Media", "Auto Poster", "Social Media Management", "Content Calendar", "Video Editor", "Analytics"],
  authors: [{ name: "SocialPilot" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
