import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Loud Legacy Ventures — The Identity Layer for the Physical World",
  description:
    "Behavioral data infrastructure company building the identity layer for the physical world. Four interconnected products — Rally, Business Now, Valora, Legacy CRM — proving who actually shows up, starting with sports.",
  keywords: "behavioral data, fan engagement, sports analytics, real estate intelligence, verified identity, stadium data, sports sponsorship attribution, Loud Legacy Ventures, Rally",
  icons: {
    icon: "/favicon.ico"
  },
  openGraph: {
    title: "Loud Legacy Ventures — The Identity Layer for the Physical World",
    description: "Behavioral data infrastructure company proving who actually shows up. Four products. One data asset. Starting with sports.",
    type: "website",
    siteName: "Loud Legacy Ventures",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loud Legacy Ventures — Prove You Were There",
    description: "Building the identity layer for the physical world, starting with sports. 520+ teams. 7 leagues. Verified behavioral data.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
