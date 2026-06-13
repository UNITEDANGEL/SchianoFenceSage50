import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Schiano Fence Sage 50 Quote App",
  description: "Fence quote app with Sage 50 inventory integration"
};
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
