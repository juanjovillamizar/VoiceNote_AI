"use client";
import { apiGetShared, Meeting } from "@/lib/api";
import {
  AlertCircle,
  BookOpen,
  Clock,
  FileText,
  Loader2,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function fmt(s: number) {
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

const SPK_COLORS: Record<
  string,
  { text: string; bg: string; border: string; dot: string }
> = {
  "Hablante 1": {
    text: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-l-indigo-500",
    dot: "bg-indigo-400",
  },
  "Hablante 2": {
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-l-violet-500",
    dot: "bg-violet-400",
  },
  "Hablante 3": {
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-l-cyan-500",
    dot: "bg-cyan-400",
  },
  "Hablante 4": {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-l-emerald-500",
    dot: "bg-emerald-400",
  },
  "Speaker 1": {
    text: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-l-indigo-500",
    dot: "bg-indigo-400",
  },
  "Speaker 2": {
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-l-violet-500",
    dot: "bg-violet-400",
  },
};

const defaultSpkStyle = {
  text: "text-indigo-400",
  bg: "bg-indigo-500/10",
  border: "border-l-indigo-500",
  dot: "bg-indigo-400",
};

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiGetShared(token)
      .then(setMeeting)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading)
    return (
      <div className="mesh-bg min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="mesh-bg min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 sm:p-8 max-w-sm text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">
            Enlace no válido
          </p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );

  if (!meeting) return null;

  const lines = meeting.transcript
    ? meeting.transcript.split("\n").filter(Boolean)
    : [];

  const speakers = [
    ...new Set(lines.map((l) => l.split(":")[0].trim())),
  ].filter(Boolean);
  const wordCount = meeting.transcript.split(/\s+/).filter(Boolean).length;

  return (
    <div className="mesh-bg min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg btn-primary flex items-center justify-center shrink-0">
            <Mic size={15} />
          </div>
          <span className="text-sm font-semibold grad-text">VoiceNote AI</span>
          <span className="ml-0 sm:ml-2 text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
            Reunión compartida
          </span>
        </div>

        {/* Title card */}
        <div className="glass rounded-2xl p-5 sm:p-6 md:p-8 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 break-words leading-tight">
            {meeting.title}
          </h1>

          {/* Meta pills - Wrap y adaptables a móvil */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full">
              <Clock size={11} className="shrink-0" />
              {new Date(meeting.created_at).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full">
              <Clock size={11} className="shrink-0" />
              {fmt(meeting.duration)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full">
              <Users size={11} className="shrink-0" />
              {speakers.length} hablante{speakers.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full">
              <BookOpen size={11} className="shrink-0" />
              {wordCount} palabras
            </div>
          </div>

          {/* Speaker legend */}
          {speakers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {speakers.map((spk) => {
                const style = SPK_COLORS[spk] ?? defaultSpkStyle;
                return (
                  <span
                    key={spk}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-white/10 ${style.text} ${style.bg}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}
                    />
                    {spk}
                  </span>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {meeting.summary && (
            <div className="mb-6 p-4 sm:p-5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <p className="text-xs font-semibold text-violet-400 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={11} className="shrink-0" />
                Resumen IA
              </p>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {meeting.summary}
              </div>
            </div>
          )}

          {/* Transcript */}
          {lines.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <FileText size={11} className="shrink-0" />
                Transcripción
              </p>
              <div className="space-y-3">
                {lines.map((line, i) => {
                  const c = line.indexOf(":");
                  const spk = c > -1 ? line.slice(0, c).trim() : "";
                  const txt = c > -1 ? line.slice(c + 1).trim() : line;
                  const style = SPK_COLORS[spk] ?? defaultSpkStyle;

                  return (
                    <div
                      key={i}
                      className={`rounded-xl rounded-tl-sm border border-l-2 px-4 py-3 ${style.bg} ${style.border}`}
                    >
                      {spk && (
                        <p
                          className={`text-xs font-bold mb-1.5 flex items-center gap-1.5 ${style.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}
                          />
                          {spk}
                        </p>
                      )}
                      <p className="text-sm text-slate-200 leading-relaxed break-words">
                        {txt}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {lines.length === 0 && !meeting.summary && (
            <div className="text-center py-10 text-slate-600">
              <FileText size={40} strokeWidth={0.8} className="mx-auto mb-3" />
              <p className="text-sm">Sin contenido para mostrar</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-700 pb-6">
          Generado con{" "}
          <span className="grad-text font-semibold">VoiceNote AI</span>
        </p>
      </div>
    </div>
  );
}
