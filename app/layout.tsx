import "./globals.css";
import { ToastProvider } from "@/components/ui/use-toast";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  // keep metadata here (but NOT viewport)
  title: '80/20 Focus Optimizer',
  description: "Plan · Focus · Learn",
};

export const viewport: Viewport = {
  // move viewport here (NOT in metadata)
  width: "device-width",
  initialScale: 1,
  // optional:
  // themeColor: "#0f172a",
  // maximumScale: 1,
  // userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}