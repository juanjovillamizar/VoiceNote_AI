import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceNote AI – Transcripción Inteligente de Reuniones",
  description: "Transcripción en tiempo real con Groq Whisper, resúmenes con Claude AI, exportación PDF/Word y más.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased bg-[#0a0a0f] text-white">{children}</body>
    </html>
  );
}