import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./loud-legacy.css";

export const metadata: Metadata = {
  title: "Loud Legacy | Building Platforms That Create Opportunity",
  description:
    "Loud Legacy builds platforms at the intersection of business, relationships, and long-term impact. The Collective is our first initiative — a private network designed to create real business opportunities.",
  keywords: "Loud Legacy, The Collective, platform builder, business network, curated membership, strategic introductions, premium experiences, Chicago",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Loud Legacy | Building Platforms That Create Opportunity",
    description:
      "Platforms designed to connect people, ideas, and opportunity. The Collective is live — a private network of business leaders creating real outcomes.",
    type: "website",
    siteName: "Loud Legacy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loud Legacy | Building Platforms That Create Opportunity",
    description:
      "Platforms designed to connect people, ideas, and opportunity. The Collective is live.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
