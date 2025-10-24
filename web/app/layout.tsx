import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Inter Variable font for body text with weights: 450, 550, 600
const inter = localFont({
  src: "../fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// ABC Diatype fonts
const abcDiatype = localFont({
  src: [
    {
      path: "../fonts/ABCDiatype-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ABCDiatype-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/ABCDiatype-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-abc-diatype",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// Berkeley Mono fonts (Regular)
const berkeleyMono = localFont({
  src: [
    {
      path: "../fonts/BerkeleyMono-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/BerkeleyMono-Oblique.otf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-berkeley-mono",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: "Maximus Wallet Manager",
  description: "Manage your Solana wallets for Maximus agent",
  icons: {
    icon: "/favicon.svg",
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
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${abcDiatype.variable} ${berkeleyMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

