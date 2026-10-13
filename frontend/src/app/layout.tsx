import type { Metadata } from "next";
import { Space_Grotesk, Orbitron, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "@/styles/highlight.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "THE AGENT - One Agent. Infinite Possibilities.",
  description:
    "A next-generation intelligent AI operating environment powered by DeepSeek.",
  applicationName: "THE AGENT",
  keywords: ["AI", "assistant", "DeepSeek", "chat", "agent"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${orbitron.variable} ${jetbrains.variable} dark`}
    >
      <body className="font-sans min-h-screen antialiased">
        <div
          className="fixed inset-0"
          style={{ backgroundColor: "#05080D", zIndex: -3 }}
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/background.jpg')",
            opacity: 0.35,
            zIndex: -2,
          }}
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(0, 223, 255, 0.08) 0%, transparent 60%)",
            zIndex: -1,
          }}
          aria-hidden="true"
        />
        <div className="relative" style={{ zIndex: 1 }}>
          {children}
        </div>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(10, 20, 35, 0.95)",
              border: "1px solid rgba(0, 223, 255, 0.3)",
              color: "#F5FAFF",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </body>
    </html>
  );
}
