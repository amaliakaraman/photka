import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Photka",
  description: "On-demand photography sessions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white font-helvetica">
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
