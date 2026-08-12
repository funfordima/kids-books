import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kids Books",
  description: "Safe personalized children's book generator"
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Kids Books
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/pricing">Pricing</Link>
            <Link href="/templates">Templates</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/create">Create</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
