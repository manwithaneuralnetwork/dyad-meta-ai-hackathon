import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dyad — Find things to do together",
  description: "Discover local activities and meet people who want to show up too.",
  applicationName: "Dyad",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Dyad" },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
