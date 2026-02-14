import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MobileHeader from "./components/MobileHeader";
import ToastProvider from "./components/ToastProvider";
import ConfirmProvider from "./components/ConfirmProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monthly Goals Planner",
  description: "Plan and track your monthly goals across weekly sprints.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MobileHeader />
        <ToastProvider />
        <ConfirmProvider />
        <div className="pt-16 lg:pt-0">{children}</div>
      </body>
    </html>
  );
}
