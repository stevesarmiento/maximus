import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maximus Wallet Manager",
  description: "Manage your Solana wallets for Maximus agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

