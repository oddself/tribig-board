import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Tribig Board",
    template: "%s | Tribig Board"
  },
  description: "Project and visual planning for university clubs.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/tribig-icon.svg",
    apple: "/icons/tribig-icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#0f766e"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
   <html lang="en" suppressHydrationWarning>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
