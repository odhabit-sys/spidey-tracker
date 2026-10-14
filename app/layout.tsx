import type { Metadata, Viewport } from "next";
import { Silkscreen } from "next/font/google";
import DeviceShell from "@/components/device/DeviceShell";
import "./globals.css";

// 5x7 dot-matrix style pixel font, close to classic handheld readouts.
const silkscreen = Silkscreen({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-silkscreen" });

export const metadata: Metadata = {
  title: "Spidey Tracker",
  description: "Temporary, consent-based friend location sharing on a retro pixel tracker.",
  applicationName: "Spidey Tracker",
  appleWebApp: { capable: true, title: "Spidey", statusBarStyle: "black-translucent" },
  other: { "apple-mobile-web-app-capable": "yes" }, // older iOS still reads this name
  formatDetection: { telephone: false },
  robots: { index: false, follow: false }, // invite/tracker pages must never be indexed
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2f8fce",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={silkscreen.variable}>
      <body>
        <DeviceShell>{children}</DeviceShell>
      </body>
    </html>
  );
}
