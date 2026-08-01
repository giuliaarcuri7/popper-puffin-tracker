import type { Metadata } from "next";
import "./globals.css";
import "./marker.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "Popper Puffin Tracker",
  description: "Follow Popper Puffin’s magical Christmas Eve flight around the world.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
