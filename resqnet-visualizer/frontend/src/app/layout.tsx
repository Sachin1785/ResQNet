import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResQNet Command Dashboard",
  description: "Disaster Resource Allocation Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950">
        {children}
      </body>
    </html>
  );
}
