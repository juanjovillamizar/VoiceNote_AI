"use client";

import {
  apiChatWithMeeting,
  apiCreateDonation,
  apiCreateMeeting,
  apiDeleteAccount,
  apiDeleteMeeting,
  apiFetchMeetings,
  apiMe,
  apiShareMeeting,
  apiSummarizeMeeting,
  apiUpdateMeeting,
  apiUpdateProfile,
  clearToken,
  getToken,
} from "@/lib/api";
import clsx from "clsx";
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileDown,
  FileText,
  Globe, // <--- AÑADIDO
  Heart,
  HeartHandshake,
  Home,
  Info,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Mic,
  Pause,
  Pencil,
  Pin,
  PinOff,
  Play,
  Save,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

// ── 1. IMPORTAR MERCADO PAGO ──
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react"; // <--- AÑADIDO 'Wallet'

if (typeof window !== "undefined") {
  const mpKey =
    process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ||
    "APP_USR-630d8029-cd52-4fcc-8107-c985a769e712";
  initMercadoPago(mpKey, {
    locale: "es-CO",
  });
}
// ── Types ──────────────────────────────────────────────────────────────────────
interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  final: boolean;
  ts: number;
}
interface Meeting {
  id: number;
  title: string;
  transcript: string;
  summary: string;
  duration: number;
  share_token: string | null;
  created_at: string;
}
interface UserType {
  id: number;
  name: string;
  email: string;
  created_at: string;
}
type Nav = "home" | "conversations" | "settings" | "donations";
type Toast = { msg: string; type: "ok" | "err" | "info" };
type AmbientMode = "silence" | "noise" | "conference";
type Language = "es" | "en";

// ── i18n ───────────────────────────────────────────────────────────────────────
const T: Record<Language, Record<string, string>> = {
  es: {
    brand: "VoiceNote AI",
    home: "Inicio",
    conversations: "Conversaciones",
    settings: "Configuración",
    recent: "Recientes",
    record: "Grabar",
    stop: "Detener",
    pause: "Pausar",
    resume: "Reanudar",
    upload: "Subir",
    search: "Buscar reuniones…",
    noTranscript: "Sin transcripción",
    noTranscriptSub: "Graba en vivo o sube un archivo",
    summary: "Resumen IA",
    summarizing: "Resumiendo…",
    export: "Exportar",
    share: "Compartir",
    clean: "Limpiar",
    cleanOn: "Limpio",
    greeting: "Hola",
    greetingSub:
      "Pulsa Grabar para transcribir con Groq Whisper, o Subir para un archivo.",
    speaker: "Hablante",
    words: "palabras",
    readMin: "min lectura",
    hours: "Horas grabadas",
    thisMonth: "Notas este mes",
    totalMeetings: "Reuniones total",
    allMeetings: "Todas las reuniones",
    noMeetings: "Sin reuniones",
    loadMore: "Cargar más",
    live: "LIVE",
    paused: "PAUSA",
    processing: "IA procesando…",
    recording: "Grabando — Groq Whisper transcribe cada 10 seg",
    saved: "✅ Reunión guardada",
    deleted: "🗑️ Eliminada",
    copied: "🔗 Link copiado",
    textCopied: "📋 Texto copiado",
    summaryDone: "✨ Resumen generado",
    errorSave: "Error al guardar",
    errorDelete: "Error al eliminar",
    errorMic: "⚠️ No se pudo acceder al micrófono",
    uploading: "Enviando al servidor…",
    uploadDone: "transcrito",
    donations: "Contribuciones",
    supportDev: "Apoya el Proyecto",
  },
  en: {
    brand: "VoiceNote AI",
    home: "Home",
    conversations: "Conversations",
    settings: "Settings",
    recent: "Recent",
    record: "Record",
    stop: "Stop",
    pause: "Pause",
    resume: "Resume",
    upload: "Upload",
    search: "Search meetings…",
    noTranscript: "No transcript",
    noTranscriptSub: "Record live or upload a file",
    summary: "AI Summary",
    summarizing: "Summarizing…",
    export: "Export",
    share: "Share",
    clean: "Clean",
    cleanOn: "Clean",
    greeting: "Hello",
    greetingSub:
      "Press Record to transcribe with Groq Whisper, or Upload a file.",
    speaker: "Speaker",
    words: "words",
    readMin: "min read",
    hours: "Recorded hours",
    thisMonth: "Notes this month",
    totalMeetings: "Total meetings",
    allMeetings: "All meetings",
    noMeetings: "No meetings",
    loadMore: "Load more",
    live: "LIVE",
    paused: "PAUSED",
    processing: "AI processing…",
    recording: "Recording — Groq Whisper transcribes every 10s",
    saved: "✅ Meeting saved",
    deleted: "🗑️ Deleted",
    copied: "🔗 Link copied",
    textCopied: "📋 Text copied",
    summaryDone: "✨ Summary generated",
    errorSave: "Error saving",
    errorDelete: "Error deleting",
    errorMic: "⚠️ Could not access microphone",
    uploading: "Sending to server…",
    uploadDone: "transcribed",
    donations: "Contributions",
    supportDev: "Support the Project",
  },
};

// ── Constants ──────────────────────────────────────────────────────────────────
const LIMIT = 15;
const FILLERS =
  /\b(eh+|ah+|mm+|uhh?|este|o sea|pues|bueno|digamos|osea)\b[,.]?\s*/gi;
const GLOSSARY: Record<string, string> = {
  doker: "Docker",
  kubernets: "Kubernetes",
  paiton: "Python",
  reac: "React",
  noud: "Node",
  apai: "API",
};

const AMBIENT_CONSTRAINTS: Record<AmbientMode, MediaTrackConstraints> = {
  silence: {
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 16000,
  },
  noise: {
    noiseSuppression: false,
    echoCancellation: false,
    autoGainControl: false,
    channelCount: 1,
  },
  conference: {
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 44100,
  },
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const wordCount = (lines: TranscriptLine[]) =>
  lines.reduce((acc, l) => acc + l.text.split(/\s+/).filter(Boolean).length, 0);
const readingMinutes = (wc: number) => Math.max(1, Math.round(wc / 200));

function applyGlossary(text: string): string {
  let t = text;
  for (const [wrong, correct] of Object.entries(GLOSSARY)) {
    t = t.replace(new RegExp(`\\b${wrong}\\b`, "gi"), correct);
  }
  return t;
}

function cleanText(text: string): string {
  return applyGlossary(
    text
      .replace(FILLERS, " ")
      .replace(/\b(\w+)(\s+\1)+\b/gi, "$1")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

interface CleanStats {
  fillers: number;
  repeats: number;
  glossary: number;
}
function analyzeClean(text: string): CleanStats {
  const fillers = (text.match(FILLERS) || []).length;
  const repeats = (text.match(/\b(\w+)(\s+\1)+\b/gi) || []).length;
  let glossary = 0;
  for (const wrong of Object.keys(GLOSSARY)) {
    if (new RegExp(`\\b${wrong}\\b`, "gi").test(text)) glossary++;
  }
  return { fillers, repeats, glossary };
}

const SPK_STYLES: Record<
  string,
  { pill: string; bubble: string; avatar: string; border: string }
> = {
  "Hablante 1": {
    pill: "bg-indigo-500/20 text-indigo-300",
    bubble: "bg-indigo-500/10 border-indigo-500/25",
    avatar: "bg-gradient-to-br from-indigo-500 to-indigo-700",
    border: "border-l-indigo-500",
  },
  "Hablante 2": {
    pill: "bg-violet-500/20 text-violet-300",
    bubble: "bg-violet-500/10 border-violet-500/25",
    avatar: "bg-gradient-to-br from-violet-500 to-violet-700",
    border: "border-l-violet-500",
  },
  "Hablante 3": {
    pill: "bg-cyan-500/20 text-cyan-300",
    bubble: "bg-cyan-500/10 border-cyan-500/25",
    avatar: "bg-gradient-to-br from-cyan-500 to-cyan-700",
    border: "border-l-cyan-500",
  },
  "Hablante 4": {
    pill: "bg-emerald-500/20 text-emerald-300",
    bubble: "bg-emerald-500/10 border-emerald-500/25",
    avatar: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    border: "border-l-emerald-500",
  },
};
const spkStyle = (s: string) =>
  SPK_STYLES[s] ?? {
    pill: "bg-indigo-500/20 text-indigo-300",
    bubble: "bg-indigo-500/10 border-indigo-500/25",
    avatar: "bg-gradient-to-br from-indigo-500 to-indigo-700",
    border: "border-l-indigo-500",
  };

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={clsx(
              "transition-colors",
              (hover || value) >= star
                ? "text-amber-400 fill-amber-400"
                : "text-slate-600",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  // ── ESTADOS DEL CHECKOUT MERCADO PAGO ──
  const [donationAmount, setDonationAmount] = useState(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [mpPreferenceId, setMpPreferenceId] = useState<string | null>(null);
  const [loadingDonation, setLoadingDonation] = useState(false);

  // ── FUNCIÓN PARA GENERAR EL PAGO ──
  async function handleGenerateDonation() {
    const amount = customAmount ? parseInt(customAmount, 10) : donationAmount;
    if (isNaN(amount) || amount < 1000) {
      notify(
        lang === "es"
          ? "El monto mínimo es $1.000 COP"
          : "Minimum amount is $1.000 COP",
        "err",
      );
      return;
    }
    setLoadingDonation(true);
    setMpPreferenceId(null);
    try {
      const { preference_id } = await apiCreateDonation(amount);
      setMpPreferenceId(preference_id);
    } catch (err: unknown) {
      notify(
        (err as Error)?.message ?? "Error al conectar con Mercado Pago",
        "err",
      );
    } finally {
      setLoadingDonation(false);
    }
  }
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== "undefined")
      return (localStorage.getItem("vn_lang") as Language) ?? "es";
    return "es";
  });
  const t = (key: string) => T[lang][key] ?? key;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 1) return lang === "es" ? "Ahora mismo" : "Just now";
    if (diffMin < 60)
      return lang === "es" ? `Hace ${diffMin} min` : `${diffMin} min ago`;
    if (diffH < 24) return lang === "es" ? `Hace ${diffH}h` : `${diffH}h ago`;
    if (diffD < 7)
      return lang === "es"
        ? `Hace ${diffD} día${diffD > 1 ? "s" : ""}`
        : `${diffD} day${diffD > 1 ? "s" : ""} ago`;
    return d.toLocaleString(lang === "es" ? "es-CO" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const [user, setUser] = useState<UserType | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  // AI Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chunkStatus, setChunkStatus] = useState<"idle" | "sending">("idle");
  const [interimText, setInterimText] = useState("");
  const [ambientMode, setAmbientMode] = useState<AmbientMode>("silence");
  const [showAmbient, setShowAmbient] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [nav, setNav] = useState<Nav>("home");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  const [hasAudio, setHasAudio] = useState(false);
  const [cleanStats, setCleanStats] = useState<CleanStats | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const [cleanMode, setCleanMode] = useState(false);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingLineText, setEditingLineText] = useState("");

  const [selectedText, setSelectedText] = useState("");
  const [selectionPos, setSelectionPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [settingsTab, setSettingsTab] = useState<
    "profile" | "appearance" | "api" | "about"
  >("profile");
  const [profileName, setProfileName] = useState("");
  const [profileCurrentPw, setProfileCurrentPw] = useState("");
  const [profileNewPw, setProfileNewPw] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [saveModal, setSaveModal] = useState<{
    open: boolean;
    blob: Blob | null;
    lines: TranscriptLine[];
    duration: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const speakerIndex = useRef(0);
  const activeMeetingRef = useRef<Meeting | null>(null);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastOffsetRef = useRef(0);
  const mimeTypeRef = useRef("audio/webm");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    activeMeetingRef.current = activeMeeting;
  }, [activeMeeting]);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    if (user) setProfileName(user.name);
  }, [user]);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    apiMe()
      .then((u: UserType) => {
        setUser(u);
        setAuthLoading(false);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  // ── Cargar Reuniones (Con Paginación) ─────────────────────────────────────────
  const loadMeetings = useCallback(
    async (reset: boolean = true) => {
      if (reset) setLoadingMeetings(true);
      else setLoadingMore(true);

      try {
        const skip = reset ? 0 : meetings.length;
        const data = await apiFetchMeetings(skip, LIMIT);

        if (reset) {
          setMeetings(data);
        } else {
          setMeetings((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newItems = data.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newItems];
          });
        }
        setHasMore(data.length === LIMIT);
      } catch {
        notify("Error al cargar reuniones", "err");
      } finally {
        setLoadingMeetings(false);
        setLoadingMore(false);
      }
    },
    [meetings.length],
  );

  useEffect(() => {
    if (!authLoading) loadMeetings(true);
  }, [authLoading]);

  // ── Toast ─────────────────────────────────────────────────────────────────────
  function notify(msg: string, type: Toast["type"] = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }

  // ── Polling para tareas en segundo plano (Background Tasks) ──────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const processingIds = meetings
      .filter((m) => m.transcript === "[PROCESANDO]")
      .map((m) => m.id);

    if (processingIds.length > 0) {
      interval = setInterval(async () => {
        try {
          const freshMeetings = await apiFetchMeetings(
            0,
            meetings.length || LIMIT,
          );
          setMeetings(freshMeetings);

          if (
            activeMeetingRef.current &&
            activeMeetingRef.current.transcript === "[PROCESANDO]"
          ) {
            const updated = freshMeetings.find(
              (m) => m.id === activeMeetingRef.current!.id,
            );
            if (updated && updated.transcript !== "[PROCESANDO]") {
              setActiveMeeting((prev) =>
                prev
                  ? {
                      ...prev,
                      transcript: updated.transcript,
                      duration: updated.duration,
                    }
                  : null,
              );
              activeMeetingRef.current = updated;

              if (updated.transcript.startsWith("[ERROR]")) {
                notify(
                  lang === "es"
                    ? "Error al procesar el archivo"
                    : "Error processing file",
                  "err",
                );
              } else {
                notify(
                  lang === "es"
                    ? `✅ "${updated.title}" transcrito con éxito`
                    : `✅ "${updated.title}" successfully transcribed`,
                );
              }

              const lines = (updated.transcript || "")
                .split("\n")
                .filter(Boolean)
                .map((l, i) => {
                  const c = l.indexOf(":");
                  return {
                    id: `l-${i}-${Date.now()}`,
                    speaker: c > -1 ? l.slice(0, c).trim() : "Hablante 1",
                    text: c > -1 ? l.slice(c + 1).trim() : l,
                    final: true,
                    ts: i * 4,
                  };
                });
              setTranscript(lines);
            }
          }
        } catch (e) {}
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [meetings, lang]);

  // ── Scroll ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editingLineId)
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimText, editingLineId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting, isChatOpen]);

  // ── Playback timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.ontimeupdate = () => setPlayhead(Math.floor(audio.currentTime));
    audio.onended = () => {
      setIsPlaying(false);
      setPlayhead(0);
    };
    return () => {
      audio.pause();
      audio.src = "";
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  // ── WaveSurfer Initialization ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeMeeting && waveformRef.current && !wavesurferRef.current) {
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "rgba(99, 102, 241, 0.4)",
        progressColor: "rgba(124, 58, 237, 0.8)",
        cursorColor: "rgba(255, 255, 255, 0.5)",
        barWidth: 2,
        barGap: 3,
        barRadius: 2,
        height: 24,
        normalize: true,
      });
      wavesurferRef.current = ws;
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("timeupdate", (currentTime) =>
        setPlayhead(Math.floor(currentTime)),
      );
      ws.on("finish", () => {
        setIsPlaying(false);
        setPlayhead(0);
      });

      if (hasAudio && audioUrlRef.current) {
        ws.load(audioUrlRef.current);
      }
    }
  }, [activeMeeting, hasAudio]);
  // ── Timers (Start, Pause, Resume, Stop) ───────────────────────────────────────
  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    elapsedRef.current = 0;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }
  function pauseTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function resumeTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }
  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ── Audio level analyser ──────────────────────────────────────────────────────
  function startAnalyser(stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(100, Math.round(avg * 1.5)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  }
  function stopAnalyser() {
    cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setAudioLevel(0);
  }

  // ── Send FULL accumulated blob to Groq ───────────────────────────────────────
  async function sendChunk(
    meetingId: number,
    fullBlob: Blob,
    offsetSecs: number,
  ): Promise<TranscriptLine[]> {
    if (fullBlob.size < 2000) return [];
    setChunkStatus("sending");
    setInterimText("⏳ Transcribiendo con Groq...");
    const addedLines: TranscriptLine[] = [];
    try {
      const token = getToken();
      const form = new FormData();
      form.append("audio", fullBlob, "recording.webm");
      const res = await fetch(
        `https://voicenote-backend-endl.onrender.com/api/transcribe/audio/${meetingId}?token=${token}&offset=${offsetSecs.toFixed(2)}`,
        { method: "POST", body: form },
      );
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try {
          const j = await res.json();
          msg = j.detail ?? msg;
        } catch {}
        console.warn("[Groq chunk error]", msg);
        return [];
      }
      const data = await res.json();
      if (data.error && !data.segments?.length) {
        console.warn("[Groq]", data.error);
      } else if (data.segments?.length) {
        const lastSeg = data.segments[data.segments.length - 1];
        if (lastSeg?.end != null) lastOffsetRef.current = lastSeg.end;
        const newLines: TranscriptLine[] = data.segments.map((seg: any) => ({
          id: `${Date.now()}-${Math.random()}`,
          speaker: seg.speaker,
          text: seg.text,
          final: true,
          ts: seg.start ?? elapsedRef.current,
        }));
        setTranscript((prev) => [...prev, ...newLines]);
        addedLines.push(...newLines);
      } else if (data.text?.trim()) {
        const singleLine: TranscriptLine = {
          id: `${Date.now()}-${Math.random()}`,
          speaker: `Hablante ${(speakerIndex.current % 4) + 1}`,
          text: data.text.trim(),
          final: true,
          ts: elapsedRef.current,
        };
        setTranscript((prev) => [...prev, singleLine]);
        speakerIndex.current++;
        addedLines.push(singleLine);
      }
    } catch {
      console.warn("Error de red al transcribir");
    } finally {
      setChunkStatus("idle");
      setInterimText("");
    }
    return addedLines;
  }

  // ── Recording Actions ──────────────────────────────────────────────────────────
  async function startRecording() {
    const title =
      lang === "es"
        ? `Reunión – ${new Date().toLocaleString("es-CO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
        : `Meeting – ${new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
    let meeting: Meeting;
    try {
      meeting = await apiCreateMeeting({ title, transcript: "", duration: 0 });
    } catch (e: unknown) {
      notify((e as Error)?.message ?? "Error al crear reunión", "err");
      return;
    }
    setActiveMeeting(meeting);
    activeMeetingRef.current = meeting;
    setTranscript([]);
    setInterimText("");
    speakerIndex.current = 0;
    audioChunksRef.current = [];
    lastOffsetRef.current = 0;
    setNav("home");
    setMobileMenuOpen(false);
    const audioConstraints = AMBIENT_CONSTRAINTS[ambientMode];
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        notify(t("errorMic"), "err");
        return;
      }
    }
    streamRef.current = stream;
    setIsRecording(true);
    setIsPaused(false);
    startTimer();
    startAnalyser(stream);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
    mimeTypeRef.current = mimeType;
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (!e.data || e.data.size === 0) return;
      audioChunksRef.current.push(e.data);
    };
    recorder.start(1000);
    const modeLabel: Record<AmbientMode, string> = {
      silence: lang === "es" ? "Modo Silencio" : "Silence Mode",
      noise: lang === "es" ? "Modo Ruido" : "Noise Mode",
      conference: lang === "es" ? "Modo Conferencia" : "Conference Mode",
    };
    notify(
      lang === "es"
        ? `🎙️ Grabando en ${modeLabel[ambientMode]} · La transcripción aparecerá al Detener`
        : `🎙️ Recording in ${modeLabel[ambientMode]} · Transcript will appear on Stop`,
      "ok",
    );
  }

  function pauseRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      pauseTimer();
      setIsPaused(true);
      notify(
        lang === "es" ? "⏸ Grabación pausada" : "⏸ Recording paused",
        "info",
      );
    }
  }

  function resumeRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      resumeTimer();
      setIsPaused(false);
      notify(
        lang === "es" ? "▶️ Grabación reanudada" : "▶️ Recording resumed",
        "info",
      );
    }
  }

  async function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      if (mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopTimer();
    stopAnalyser();
    setIsRecording(false);
    setIsPaused(false);
    setChunkStatus("idle");
    await new Promise((r) => setTimeout(r, 800));
    const meeting = activeMeetingRef.current;
    if (!meeting) return;
    const allChunks = audioChunksRef.current;
    let freshLines: TranscriptLine[] = [];
    let recordedBlob: Blob | null = null;
    if (allChunks.length > 0) {
      setInterimText("⏳ Transcribiendo con Groq Whisper...");
      recordedBlob = new Blob(allChunks, { type: mimeTypeRef.current });
      freshLines = await sendChunk(meeting.id, recordedBlob, 0);
    }
    setInterimText("");
    if (recordedBlob) {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(recordedBlob);
      setHasAudio(true);
      if (wavesurferRef.current) {
        wavesurferRef.current.load(audioUrlRef.current);
      }
    }
    const existingLines = transcriptRef.current.filter((l) => l.final);
    const existingIds = new Set(existingLines.map((l) => l.id));
    const allLines = [
      ...existingLines,
      ...freshLines.filter((l) => !existingIds.has(l.id)),
    ];
    setSaveModal({
      open: true,
      blob: recordedBlob,
      lines: allLines,
      duration: elapsedRef.current,
    });
  }

  // ── Open meeting ───────────────────────────────────────────────────────────────
  function openMeeting(m: Meeting) {
    setActiveMeeting(m);
    activeMeetingRef.current = m;
    setIsPlaying(false);
    setPlayhead(0);
    setShareUrl(null);
    setHasAudio(false);
    if (wavesurferRef.current) {
      wavesurferRef.current.pause();
      wavesurferRef.current.empty();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setExportOpen(false);
    setInterimText("");
    setSpeakerNames({});
    setRenamingId(null);
    setEditingLineId(null);
    setCleanMode(false);
    setEditingTitle(false);
    setTitleValue(m.title);
    setIsChatOpen(false);
    setChatMessages([]);
    setChatInput("");

    if (m.transcript === "[PROCESANDO]") {
      setTranscript([]);
    } else {
      const lines: TranscriptLine[] = (m.transcript || "")
        .split("\n")
        .filter(Boolean)
        .map((l, i) => {
          const c = l.indexOf(":");
          return {
            id: `l-${i}-${Date.now()}`,
            speaker: c > -1 ? l.slice(0, c).trim() : "Hablante 1",
            text: c > -1 ? l.slice(c + 1).trim() : l,
            final: true,
            ts: i * 4,
          };
        });
      setTranscript(lines);
    }
    setNav("home");
  }

  // ── Save meeting title ────────────────────────────────────────────────────────
  async function saveTitle() {
    if (
      !activeMeeting ||
      !titleValue.trim() ||
      titleValue.trim() === activeMeeting.title
    ) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      const updated = await apiUpdateMeeting(activeMeeting.id, {
        title: titleValue.trim(),
      });
      setActiveMeeting(updated);
      activeMeetingRef.current = updated;
      setMeetings((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      notify("✅ Título actualizado");
    } catch {
      notify("Error al guardar título", "err");
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  // ── Save transcript text edit ─────────────────────────────────────────────────
  async function saveLineText(id: string) {
    if (!activeMeeting || !editingLineText.trim()) {
      setEditingLineId(null);
      return;
    }
    const newText = editingLineText.trim();
    const newTranscript = transcript.map((l) =>
      l.id === id ? { ...l, text: newText } : l,
    );
    setTranscript(newTranscript);
    setEditingLineId(null);
    const fullText = newTranscript
      .filter((l) => l.final)
      .map((l) => `${l.speaker}: ${l.text}`)
      .join("\n");
    try {
      const updated = await apiUpdateMeeting(activeMeeting.id, {
        transcript: fullText,
      });
      setActiveMeeting(updated);
      activeMeetingRef.current = updated;
      setMeetings((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      notify(
        lang === "es" ? "✏️ Transcripción editada" : "✏️ Transcript edited",
        "ok",
      );
    } catch {
      notify(
        lang === "es" ? "Error al guardar edición" : "Error saving edit",
        "err",
      );
    }
  }

  // ── Chat IA (Gemini) ───────────────────────────────────────────────────────────
  async function handleChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !activeMeeting) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsChatting(true);

    try {
      const { answer } = await apiChatWithMeeting(activeMeeting.id, userMsg);
      setChatMessages((prev) => [...prev, { role: "ai", text: answer }]);
    } catch (err: unknown) {
      notify((err as Error)?.message ?? "Error al consultar a Gemini", "err");
    } finally {
      setIsChatting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────────
  async function deleteMeeting(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await apiDeleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      setPinnedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      if (activeMeeting?.id === id) {
        setActiveMeeting(null);
        setTranscript([]);
        setIsChatOpen(false);
      }
      notify(t("deleted"));
    } catch {
      notify(t("errorDelete"), "err");
    }
  }

  // ── Pin ────────────────────────────────────────────────────────────────────────
  function togglePin(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  // ── AI Summary ─────────────────────────────────────────────────────────────────
  async function summarize() {
    if (!activeMeeting) return;
    setSummarizing(true);
    try {
      const { summary } = await apiSummarizeMeeting(activeMeeting.id);
      const updated = { ...activeMeeting, summary };
      setActiveMeeting(updated);
      setMeetings((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      notify(t("summaryDone"));
    } catch (e: unknown) {
      notify((e as Error)?.message ?? "Error al resumir", "err");
    } finally {
      setSummarizing(false);
    }
  }

  // ── Share ──────────────────────────────────────────────────────────────────────
  async function share() {
    if (!activeMeeting) return;
    try {
      const { share_token } = await apiShareMeeting(activeMeeting.id);
      const url = `${window.location.origin}/share/${share_token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      notify(t("copied"));
    } catch (e: unknown) {
      notify((e as Error)?.message ?? "Error", "err");
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────────
  function downloadFile(format: "pdf" | "docx") {
    if (!activeMeeting) return;
    const token = getToken();
    fetch(
      `https://voicenote-backend-endl.onrender.com/api/meetings/${activeMeeting.id}/export/${format}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${activeMeeting.title.replace(/\s+/g, "_").slice(0, 40)}.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => notify("Error al exportar", "err"));
    setExportOpen(false);
  }

  // ── File Upload (Actualizado a Background Tasks) ──────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) (e.target as HTMLInputElement).value = "";
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(t("uploading"));
    try {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `https://voicenote-backend-endl.onrender.com/api/transcribe/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ detail: `Error ${res.status}` }));
        throw new Error(err.detail ?? `Error ${res.status}`);
      }
      const meeting: Meeting = await res.json();
      setMeetings((prev) => [meeting, ...prev]);
      openMeeting(meeting);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(file);
      setHasAudio(true);
      if (wavesurferRef.current) {
        wavesurferRef.current.load(audioUrlRef.current);
      }
      notify(
        lang === "es"
          ? `⏳ "${meeting.title}" enviado al servidor...`
          : `⏳ "${meeting.title}" sent to server...`,
        "info",
      );
    } catch (err: unknown) {
      notify((err as Error)?.message ?? "Error al subir", "err");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  }

  // ── Text selection ────────────────────────────────────────────────────────────
  function handleTextSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (text.length > 5) {
      const range = sel?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setSelectedText(text);
        setSelectionPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      }
    } else {
      setSelectedText("");
      setSelectionPos(null);
    }
  }
  function shareSnapshot() {
    if (!selectedText) return;
    navigator.clipboard
      .writeText(selectedText)
      .then(() => notify(t("textCopied")));
    setSelectedText("");
    setSelectionPos(null);
  }

  // ── Profile update ─────────────────────────────────────────────────────────────
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload: {
        name?: string;
        current_password?: string;
        new_password?: string;
      } = {};
      if (profileName.trim() && profileName !== user?.name)
        payload.name = profileName.trim();
      if (profileNewPw) {
        payload.current_password = profileCurrentPw;
        payload.new_password = profileNewPw;
      }
      if (!Object.keys(payload).length) {
        notify("Sin cambios", "info");
        setSavingProfile(false);
        return;
      }
      const updated = await apiUpdateProfile(payload);
      setUser(updated);
      setProfileCurrentPw("");
      setProfileNewPw("");
      notify("✅ Perfil actualizado");
    } catch (e: unknown) {
      notify((e as Error)?.message ?? "Error", "err");
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Delete account ─────────────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (deleteInput !== user?.email) {
      notify("Email incorrecto. Escribe tu email para confirmar.", "err");
      return;
    }
    setDeletingAccount(true);
    try {
      await apiDeleteAccount();
      clearToken();
      router.replace("/login");
    } catch (e: unknown) {
      notify((e as Error)?.message ?? "Error", "err");
    } finally {
      setDeletingAccount(false);
    }
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  // ── Derived data ───────────────────────────────────────────────────────────────
  const sortedMeetings = useMemo(() => {
    const pinned = meetings.filter((m) => pinnedIds.has(m.id));
    const unpinned = meetings.filter((m) => !pinnedIds.has(m.id));
    return [...pinned, ...unpinned];
  }, [meetings, pinnedIds]);

  const filtered = sortedMeetings.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.transcript.toLowerCase().includes(search.toLowerCase()),
  );

  const displayLines = useMemo(() => {
    const lines = transcript.map((l) => ({
      ...l,
      displayText: cleanMode ? cleanText(l.text) : applyGlossary(l.text),
      displayName: speakerNames[l.speaker] || l.speaker,
    }));
    return lines;
  }, [transcript, cleanMode, speakerNames]);

  useEffect(() => {
    if (cleanMode && transcript.length > 0) {
      const fullText = transcript.map((l) => l.text).join(" ");
      setCleanStats(analyzeClean(fullText));
    } else {
      setCleanStats(null);
    }
  }, [cleanMode, transcript]);

  const wc = wordCount(displayLines.filter((l) => l.final));
  const mins = readingMinutes(wc);
  const totalHours = useMemo(
    () =>
      Math.round((meetings.reduce((a, m) => a + m.duration, 0) / 3600) * 10) /
      10,
    [meetings],
  );
  const thisMonth = useMemo(() => {
    const now = new Date();
    return meetings.filter((m) => {
      const d = new Date(m.created_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [meetings]);
  const uniqueSpeakers = useMemo(
    () => [...new Set(transcript.map((l) => l.speaker))],
    [transcript],
  );

  const busy = isUploading;
  const isProcessingBG = activeMeeting?.transcript === "[PROCESANDO]";
  const isErrorBG = activeMeeting?.transcript?.startsWith("[ERROR]");

  if (authLoading)
    return (
      <div className="mesh-bg min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
      </div>
    );

  const AMBIENT_INFO: Record<
    AmbientMode,
    { icon: React.ReactNode; label: string; desc: string }
  > = {
    silence: {
      icon: <VolumeX size={13} />,
      label: lang === "es" ? "Silencio" : "Silence",
      desc:
        lang === "es"
          ? "Supresión de ruido máxima"
          : "Maximum noise suppression",
    },
    noise: {
      icon: <Volume2 size={13} />,
      label: lang === "es" ? "Ambiente" : "Ambient",
      desc:
        lang === "es"
          ? "Sin filtros, captura natural"
          : "No filters, natural capture",
    },
    conference: {
      icon: <Users size={13} />,
      label: lang === "es" ? "Conferencia" : "Conference",
      desc:
        lang === "es"
          ? "Optimizado para múltiples voces"
          : "Optimized for multiple voices",
    },
  };

  const SETTINGS_TABS = [
    {
      id: "profile" as const,
      icon: User,
      label: lang === "es" ? "Perfil" : "Profile",
    },
    {
      id: "appearance" as const,
      icon: Globe,
      label: lang === "es" ? "Apariencia" : "Appearance",
    },
    {
      id: "about" as const,
      icon: Info,
      label: lang === "es" ? "Acerca de" : "About",
    },
  ];

  // ── Save / Discard modal ───────────────────────────────────────────────────────
  const SaveModal = () => {
    if (!saveModal?.open) return null;

    const wc = saveModal.lines.reduce(
      (a, l) => a + l.text.split(/\s+/).filter(Boolean).length,
      0,
    );
    const speakers = [...new Set(saveModal.lines.map((l) => l.speaker))];
    const dur = saveModal.duration;

    async function handleSave() {
      const meeting = activeMeetingRef.current;
      if (!meeting) return;
      const fullText = saveModal!.lines
        .map((l) => `${l.speaker}: ${l.text}`)
        .join("\n");
      setSaveModal(null);
      try {
        const updated: Meeting = await apiUpdateMeeting(meeting.id, {
          transcript: fullText,
          duration: dur,
        });
        setActiveMeeting(updated);
        activeMeetingRef.current = updated;
        setMeetings((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
        notify(t("saved"));
      } catch {
        notify(t("errorSave"), "err");
      }
      await loadMeetings(true);
    }

    async function handleDiscard() {
      const meeting = activeMeetingRef.current;
      setSaveModal(null);
      if (meeting) {
        try {
          await apiDeleteMeeting(meeting.id);
        } catch {}
      }
      setActiveMeeting(null);
      setTranscript([]);
      setHasAudio(false);
      if (wavesurferRef.current) {
        wavesurferRef.current.pause();
        wavesurferRef.current.empty();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      audioChunksRef.current = [];
      lastOffsetRef.current = 0;
      notify(
        lang === "es" ? "🗑️ Grabación descartada" : "🗑️ Recording discarded",
        "info",
      );
    }

    async function handleNew() {
      await handleDiscard();
      setTimeout(() => startRecording(), 300);
    }

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      >
        <div
          className="relative w-full max-w-md animate-fade-in"
          style={{
            background: "linear-gradient(145deg,#13131f,#0f0f1a)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "1.5rem",
            boxShadow:
              "0 0 60px rgba(99,102,241,0.15), 0 25px 50px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="h-1 w-full rounded-t-3xl"
            style={{
              background: "linear-gradient(90deg,#6366f1,#7c3aed,#22d3ee)",
            }}
          />
          <div className="px-6 pt-6 pb-7">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative mb-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                  }}
                >
                  <Mic size={28} className="text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0f0f1a]">
                  <CheckCircle2 size={13} className="text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {lang === "es" ? "¡Grabación lista!" : "Recording ready!"}
              </h2>
              <p className="text-sm text-slate-400">
                {lang === "es"
                  ? "¿Qué quieres hacer con esta transcripción?"
                  : "What would you like to do with this transcript?"}
              </p>
            </div>
            <div
              className="flex items-center justify-center gap-2 px-2 py-3 mb-7 rounded-2xl"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.15)",
              }}
            >
              {[
                {
                  icon: <Clock size={13} />,
                  val: fmt(dur),
                  label: lang === "es" ? "duración" : "duration",
                },
                {
                  icon: <Users size={13} />,
                  val: speakers.length,
                  label: lang === "es" ? "hablantes" : "speakers",
                },
                {
                  icon: <BookOpen size={13} />,
                  val: wc,
                  label: lang === "es" ? "palabras" : "words",
                },
              ].map(({ icon, val, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-0.5 flex-1"
                >
                  <div className="flex items-center gap-1 text-indigo-400 text-xs mb-0.5">
                    {icon}
                  </div>
                  <span className="text-lg font-bold text-white leading-none">
                    {val}
                  </span>
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <button
                onClick={handleSave}
                className="w-full group relative overflow-hidden flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(124,58,237,0.2))",
                  border: "1px solid rgba(99,102,241,0.4)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                  }}
                >
                  <Save size={18} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-white text-sm">
                    {lang === "es" ? "Guardar reunión" : "Save meeting"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === "es"
                      ? "Guarda la transcripción en tu historial"
                      : "Save the transcript to your history"}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
              <button
                onClick={handleNew}
                className="w-full group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(34,211,238,0.07)",
                  border: "1px solid rgba(34,211,238,0.25)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#0891b2,#22d3ee)",
                  }}
                >
                  <Mic size={18} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-white text-sm">
                    {lang === "es" ? "Nueva grabación" : "New recording"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === "es"
                      ? "Descarta esta y empieza a grabar ya"
                      : "Discard this and start recording now"}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
              <button
                onClick={handleDiscard}
                className="w-full group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-red-400 text-sm">
                    {lang === "es" ? "Eliminar grabación" : "Delete recording"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === "es"
                      ? "Descarta todo sin guardar"
                      : "Discard everything without saving"}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem("vn_lang", l);
  };

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen overflow-hidden mesh-bg"
      onMouseUp={handleTextSelection}
    >
      <SaveModal />
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.ogg,.wav,.m4a,.mp4,.mov,.avi,.mkv,.webm"
        className="hidden"
        onChange={handleFileUpload}
      />

      {selectedText && selectionPos && (
        <button
          onClick={shareSnapshot}
          style={{
            position: "fixed",
            left: selectionPos.x - 50,
            top: selectionPos.y - 40,
            zIndex: 9999,
          }}
          className="glass px-3 py-1.5 rounded-xl text-xs text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 flex items-center gap-1.5 shadow-2xl animate-fade-in"
        >
          <Copy size={11} />
          {lang === "es" ? "Copiar selección" : "Copy selection"}
        </button>
      )}

      {toast && (
        <div
          className={clsx(
            "fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl animate-fade-in flex items-center gap-2 max-w-sm",
            toast.type === "ok" &&
              "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300",
            toast.type === "err" &&
              "bg-red-500/20 border border-red-500/30 text-red-300",
            toast.type === "info" &&
              "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300",
          )}
        >
          {toast.type === "ok" && (
            <CheckCircle2 size={15} className="shrink-0" />
          )}
          <span className="break-words">{toast.msg}</span>
        </div>
      )}

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      {nav !== "donations" && (
        <aside
          className={clsx(
            "flex flex-col border-r border-[var(--border)] fixed md:relative z-50 h-full transition-transform duration-300",
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0",
          )}
          style={{
            width: "var(--sidebar)",
            minWidth: "var(--sidebar)",
            background: "rgba(10,10,15,0.95)",
          }}
        >
          <div className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg btn-primary flex items-center justify-center shrink-0">
                <Mic size={15} />
              </div>
              <span className="font-bold text-base grad-text">
                {t("brand")}
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="px-2 py-3 space-y-0.5">
            {[
              { id: "home" as Nav, icon: Home, label: t("home") },
              {
                id: "conversations" as Nav,
                icon: MessageSquareText,
                label: t("conversations"),
              },
              { id: "settings" as Nav, icon: Settings, label: t("settings") },
              {
                id: "donations" as Nav,
                icon: HeartHandshake,
                label: t("donations"),
              },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  setNav(id);
                  setMobileMenuOpen(false);
                }}
                className={clsx(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  nav === id
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5",
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <p className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {t("recent")}
            </p>
            {loadingMeetings && (
              <div className="space-y-1.5 px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-7 rounded-lg" />
                ))}
              </div>
            )}
            {!loadingMeetings &&
              sortedMeetings.slice(0, 12).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    openMeeting(m);
                    setMobileMenuOpen(false);
                  }}
                  className={clsx(
                    "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 group",
                    activeMeeting?.id === m.id
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/5",
                  )}
                >
                  {pinnedIds.has(m.id) ? (
                    <Pin size={10} className="shrink-0 text-amber-400" />
                  ) : (
                    <FileText size={10} className="shrink-0 opacity-40" />
                  )}
                  <span className="truncate flex-1">{m.title}</span>
                  <ChevronRight
                    size={9}
                    className="opacity-0 group-hover:opacity-40"
                  />
                </button>
              ))}
          </div>

          <div className="px-3 py-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full btn-primary flex items-center justify-center text-xs font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-600 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {nav === "home" && !activeMeeting && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 md:px-5 pt-4 pb-2">
            {[
              {
                label: t("hours"),
                value: `${totalHours}h`,
                icon: Clock,
                color: "text-indigo-400",
              },
              {
                label: t("thisMonth"),
                value: thisMonth,
                icon: BarChart2,
                color: "text-violet-400",
              },
              {
                label: t("totalMeetings"),
                value: meetings.length,
                icon: MessageSquareText,
                color: "text-cyan-400",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="glass rounded-xl p-3 flex items-center gap-3"
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${color}`}
                >
                  <Icon size={15} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-none">
                    {value}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {nav !== "donations" && (
          <header
            className="flex items-center gap-2 px-3 md:px-5 py-3 border-b border-[var(--border)] flex-wrap"
            style={{ background: "rgba(10,10,15,0.9)" }}
          >
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0"
            >
              <Menu size={20} />
            </button>
            <div
              className="flex items-center gap-2 flex-1 min-w-[140px] md:max-w-xs rounded-xl px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Search size={14} className="text-slate-600 shrink-0" />
              <input
                type="text"
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full"
              />
            </div>

            {activeMeeting &&
              !isRecording &&
              !isUploading &&
              !isProcessingBG &&
              !isErrorBG && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative group">
                    <button
                      onClick={() => setCleanMode((c) => !c)}
                      className={clsx(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        cleanMode
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                          : "bg-slate-700/40 border-slate-600/30 text-slate-400 hover:text-slate-200",
                      )}
                    >
                      <Wand2 size={12} />
                      {cleanMode ? t("cleanOn") : t("clean")}
                      {cleanMode &&
                        cleanStats &&
                        cleanStats.fillers +
                          cleanStats.repeats +
                          cleanStats.glossary >
                          0 && (
                          <span className="ml-1 bg-emerald-500/40 text-emerald-200 text-xs rounded-full px-1.5 py-0 leading-4">
                            {cleanStats.fillers +
                              cleanStats.repeats +
                              cleanStats.glossary}
                          </span>
                        )}
                    </button>
                  </div>

                  <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      isChatOpen
                        ? "bg-blue-500/25 border-blue-500/40 text-blue-200"
                        : "bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25",
                    )}
                  >
                    <Bot size={13} />
                    {lang === "es" ? "Chat IA" : "AI Chat"}
                  </button>

                  <button
                    onClick={summarize}
                    disabled={summarizing}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border disabled:opacity-40",
                      activeMeeting?.summary
                        ? "bg-violet-500/25 border-violet-500/40 text-violet-200"
                        : "bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25",
                    )}
                  >
                    {summarizing ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles
                        size={13}
                        className={
                          activeMeeting?.summary ? "text-violet-300" : ""
                        }
                      />
                    )}
                    {summarizing
                      ? t("summarizing")
                      : activeMeeting?.summary
                        ? lang === "es"
                          ? "Re-resumir"
                          : "Re-summarize"
                        : t("summary")}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setExportOpen((o) => !o)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 border border-slate-600/40 text-slate-300 hover:bg-slate-700 transition-all"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">{t("export")}</span>
                    </button>
                    {exportOpen && (
                      <div className="absolute right-0 top-9 z-30 glass rounded-xl overflow-hidden w-44 shadow-xl">
                        <button
                          onClick={() => downloadFile("pdf")}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                        >
                          <FileDown size={14} className="text-red-400" />
                          PDF
                        </button>
                        <button
                          onClick={() => downloadFile("docx")}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                        >
                          <FileDown size={14} className="text-blue-400" />
                          Word (.docx)
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={share}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all"
                  >
                    <Share2 size={13} />
                    <span className="hidden sm:inline">{t("share")}</span>
                  </button>
                </div>
              )}

            <div className="relative">
              <button
                onClick={() => setShowAmbient((a) => !a)}
                disabled={isUploading || isRecording}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-slate-700/40 border border-slate-600/30 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-40"
              >
                {AMBIENT_INFO[ambientMode].icon}
                <span className="hidden sm:inline">
                  {AMBIENT_INFO[ambientMode].label}
                </span>
                <ChevronDown size={11} />
              </button>
              {showAmbient && (
                <div className="absolute right-0 top-10 z-30 glass rounded-2xl overflow-hidden w-60 shadow-2xl">
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {lang === "es" ? "Modo de captura" : "Capture mode"}
                  </p>
                  {(["silence", "noise", "conference"] as AmbientMode[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setAmbientMode(mode);
                          setShowAmbient(false);
                        }}
                        className={clsx(
                          "flex items-center gap-3 w-full px-4 py-3 text-left transition-all",
                          ambientMode === mode
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                        )}
                      >
                        <div
                          className={clsx(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            ambientMode === mode
                              ? "bg-indigo-500/30"
                              : "bg-slate-700/60",
                          )}
                        >
                          {AMBIENT_INFO[mode].icon}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">
                            {AMBIENT_INFO[mode].label}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {AMBIENT_INFO[mode].desc}
                          </p>
                        </div>
                        {ambientMode === mode && (
                          <CheckCircle2
                            size={13}
                            className="ml-auto text-indigo-400"
                          />
                        )}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isRecording}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all shrink-0",
                isUploading
                  ? "bg-amber-500/20 border border-amber-500/30 text-amber-300"
                  : "bg-slate-700/60 border border-slate-600/40 text-slate-300 hover:bg-slate-600/60 disabled:opacity-40",
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="hidden sm:inline text-xs">
                    {uploadProgress}
                  </span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span className="hidden sm:inline">{t("upload")}</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {isRecording ? (
                <>
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all shrink-0",
                      isPaused
                        ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                        : "bg-slate-700/60 border border-slate-600/40 text-slate-300 hover:bg-slate-600/60",
                    )}
                  >
                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                    <span className="hidden sm:inline">
                      {isPaused ? t("resume") : t("pause")}
                    </span>
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                  >
                    <div
                      className={clsx(
                        "flex items-end gap-px w-8 h-5",
                        isPaused && "opacity-40",
                      )}
                    >
                      {Array.from({ length: 8 }).map((_, i) => {
                        const h = isPaused
                          ? 2
                          : Math.max(
                              2,
                              (audioLevel / 100) *
                                20 *
                                (0.4 +
                                  Math.abs(Math.sin(Date.now() / 200 + i)) *
                                    0.6),
                            );
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-red-400 rounded-sm transition-all duration-75"
                            style={{ height: `${Math.max(2, h)}px` }}
                          />
                        );
                      })}
                    </div>
                    {!isPaused && (
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    )}
                    <span className="hidden sm:inline">{t("stop")} · </span>{" "}
                    {fmt(elapsed)}
                  </button>
                </>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={isUploading}
                  className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 disabled:opacity-40"
                >
                  <Mic size={14} />
                  <span className="hidden sm:inline">{t("record")}</span>
                </button>
              )}
            </div>
          </header>
        )}
        {shareUrl && (
          <div className="px-5 py-2.5 flex items-center gap-3 text-sm border-b border-cyan-500/20 bg-cyan-500/10 flex-wrap">
            <Share2 size={14} className="text-cyan-400 shrink-0" />
            <span className="text-cyan-300 text-xs truncate flex-1">
              {shareUrl}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="text-cyan-400 shrink-0"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={() => setShareUrl(null)}
              className="text-cyan-600 shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        )}
        {isUploading && (
          <div className="px-5 py-2.5 flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/10">
            <Loader2
              size={14}
              className="text-amber-400 animate-spin shrink-0"
            />
            <span className="text-amber-300 text-sm">
              {uploadProgress || "Procesando…"}
            </span>
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* ── NUEVA PESTAÑA: DONACIONES Y CRÉDITOS ── */}
            {nav === "donations" && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center relative bg-slate-950/20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="w-full max-w-2xl my-auto animate-fade-in pb-10">
                  {/* Header Donaciones */}
                  <div className="text-center mb-8 mt-4">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#009EE3]/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-4 border border-[#009EE3]/30">
                      <HeartHandshake size={32} className="text-[#009EE3]" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                      Apoya a VoiceNote AI
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm max-w-md mx-auto leading-relaxed px-2">
                      VoiceNote AI es un proyecto independiente. Si la
                      herramienta te ha ayudado, considera hacer un aporte para
                      mantener los servidores funcionando.
                    </p>

                    {/* CRÉDITO DEL DESARROLLADOR RESPONSIVE */}
                    <div className="mt-6 flex flex-col items-center w-full px-2">
                      <div className="bg-slate-800/80 border border-slate-700/80 p-4 sm:px-6 sm:py-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 sm:gap-4 shadow-xl w-full max-w-sm">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-inner">
                          🧑‍💻
                        </div>
                        <div className="text-center sm:text-left flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">
                            Desarrollador Principal
                          </p>
                          <p className="text-[15px] sm:text-base text-indigo-300 font-bold leading-tight truncate">
                            Juan Jose Villamizar Diaz
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            Universidad Cooperativa de Colombia
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tarjeta Mercado Pago */}
                    <div className="glass rounded-3xl p-5 md:p-6 border border-[#009EE3]/30 bg-[#009EE3]/5 relative overflow-hidden flex flex-col">
                      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 rounded-full bg-[#009EE3]/20 blur-3xl pointer-events-none" />

                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-[#009EE3] flex items-center justify-center shadow-lg shadow-[#009EE3]/30">
                          <Zap size={20} className="text-white fill-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base md:text-lg leading-tight">
                            Mercado Pago
                          </h3>
                          <p className="text-[#009EE3] text-[10px] md:text-xs font-medium">
                            Tarjetas, PSE y Efecty
                          </p>
                        </div>
                      </div>

                      {!mpPreferenceId ? (
                        <div className="flex-1 flex flex-col relative z-10">
                          <p className="text-[10px] md:text-xs text-slate-400 mb-3 font-medium uppercase tracking-wider">
                            Selecciona un aporte
                          </p>
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {[5000, 10000, 20000].map((amt) => (
                              <button
                                key={amt}
                                onClick={() => {
                                  setDonationAmount(amt);
                                  setCustomAmount("");
                                }}
                                className={clsx(
                                  "py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border",
                                  donationAmount === amt && !customAmount
                                    ? "bg-[#009EE3] text-white border-[#009EE3] shadow-md shadow-[#009EE3]/20"
                                    : "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-[#009EE3]/50",
                                )}
                              >
                                ${amt.toLocaleString("es-CO")}
                              </button>
                            ))}
                          </div>

                          <div className="mb-6">
                            <input
                              type="number"
                              placeholder="Otro valor (Ej: 15000)"
                              value={customAmount}
                              onChange={(e) => setCustomAmount(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#009EE3]/60 transition-colors"
                            />
                          </div>

                          <button
                            onClick={handleGenerateDonation}
                            disabled={loadingDonation}
                            className="mt-auto w-full py-3 md:py-3.5 rounded-xl bg-[#009EE3] hover:bg-[#007ebe] text-white text-xs md:text-sm font-bold transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {loadingDonation ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Heart size={16} />
                            )}
                            Generar pago
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-center animate-fade-in relative z-10">
                          <p className="text-center text-sm text-slate-300 mb-4">
                            Monto:{" "}
                            <span className="font-bold text-white text-lg">
                              $
                              {(customAmount
                                ? parseInt(customAmount)
                                : donationAmount
                              ).toLocaleString("es-CO")}{" "}
                              COP
                            </span>
                          </p>
                          <Wallet
                            initialization={{
                              preferenceId: mpPreferenceId,
                              redirectMode: "modal",
                            }}
                            customization={{
                              texts: {
                                action: "pay",
                                valueProp: "security_safety",
                              },
                            }}
                          />
                          <button
                            onClick={() => setMpPreferenceId(null)}
                            className="mt-4 text-xs text-slate-500 hover:text-slate-300 text-center w-full"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tarjeta Nequi */}
                    <div className="glass rounded-3xl p-5 md:p-6 border border-[#E00B6B]/30 bg-[#E00B6B]/5 relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 rounded-full bg-[#E00B6B]/20 blur-3xl pointer-events-none" />

                      <div>
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                          <div className="w-10 h-10 rounded-xl bg-[#E00B6B] flex items-center justify-center shadow-lg shadow-[#E00B6B]/30">
                            <span className="font-bold text-white text-xl">
                              N
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base md:text-lg leading-tight">
                              Nequi
                            </h3>
                            <p className="text-[#E00B6B] text-[10px] md:text-xs font-medium">
                              Transferencia Directa
                            </p>
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-slate-400 leading-relaxed relative z-10">
                          Si prefieres hacer una transferencia directa sin
                          comisiones de pasarela, puedes enviarla a mi número
                          personal.
                        </p>
                      </div>

                      <div className="relative z-10 mt-6">
                        <p className="text-[10px] md:text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider text-center">
                          Número de Nequi
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("3145303873"); // <-- El que se copia al hacer clic
                            notify("📋 Número copiado al portapapeles", "ok");
                          }}
                          className="w-full py-3 md:py-4 rounded-xl bg-[#E00B6B]/10 border border-[#E00B6B]/40 hover:bg-[#E00B6B]/20 text-white text-lg md:text-xl font-bold text-center transition-all flex items-center justify-center gap-3"
                        >
                          314 530 3873 {/* <-- El que se ve en pantalla */}
                          <Copy size={16} className="text-[#E00B6B]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── BOTÓN PARA VOLVER AL INICIO ── */}
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => setNav("home")}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-300 transition-all shadow-lg"
                    >
                      <ArrowLeft size={16} />
                      Volver al inicio
                    </button>
                  </div>
                </div>
              </div>
            )}
            {nav === "home" && (
              <>
                {activeMeeting ? (
                  <div className="border-b border-[var(--border)]">
                    <div
                      className="h-1 w-full"
                      style={{
                        background:
                          "linear-gradient(90deg,#6366f1,#7c3aed,#22d3ee)",
                      }}
                    />
                    <div className="px-6 pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        {editingTitle ? (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              autoFocus
                              value={titleValue}
                              onChange={(e) => setTitleValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveTitle();
                                if (e.key === "Escape") setEditingTitle(false);
                              }}
                              onBlur={saveTitle}
                              className="flex-1 bg-slate-800/80 border border-indigo-500/50 text-white text-lg font-bold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                              placeholder={
                                lang === "es"
                                  ? "Nombre de la reunión…"
                                  : "Meeting name…"
                              }
                            />
                            {savingTitle ? (
                              <Loader2
                                size={16}
                                className="text-indigo-400 animate-spin shrink-0"
                              />
                            ) : (
                              <button
                                onClick={saveTitle}
                                className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0 font-semibold"
                              >
                                ✓ {lang === "es" ? "Guardar" : "Save"}
                              </button>
                            )}
                            <button
                              onClick={() => setEditingTitle(false)}
                              className="text-xs text-slate-500 hover:text-slate-300 shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setTitleValue(activeMeeting.title);
                              setEditingTitle(true);
                            }}
                            title={
                              lang === "es"
                                ? "Clic para renombrar"
                                : "Click to rename"
                            }
                            className="group flex items-center gap-2 flex-1 min-w-0 text-left hover:text-indigo-300 transition-colors"
                          >
                            <h1 className="text-lg font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                              {activeMeeting.title}
                            </h1>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Pencil size={14} className="text-indigo-400" />
                            </span>
                          </button>
                        )}
                        <div className="flex items-center gap-2 shrink-0">
                          {isRecording && (
                            <span
                              className={clsx(
                                "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
                                isPaused
                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                  : "bg-red-500/15 border-red-500/30 text-red-400 animate-pulse",
                              )}
                            >
                              <span
                                className={clsx(
                                  "w-1.5 h-1.5 rounded-full",
                                  isPaused ? "bg-amber-400" : "bg-red-400",
                                )}
                              />
                              {isPaused ? t("paused") : t("live")}
                            </span>
                          )}
                          {chunkStatus === "sending" && (
                            <span className="flex items-center gap-1.5 text-xs text-indigo-400">
                              <Loader2 size={11} className="animate-spin" />
                              {t("processing")}
                            </span>
                          )}
                          {cleanMode && (
                            <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              <Wand2 size={10} />
                              {lang === "es" ? "Limpio" : "Clean"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                          <Clock size={10} />
                          {fmtDate(activeMeeting.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                          <Clock size={10} />
                          {fmt(activeMeeting.duration || elapsed)}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                          <Users size={10} />
                          {uniqueSpeakers.length} {t("speaker")}(s)
                        </span>
                        {displayLines.length > 0 &&
                          !isProcessingBG &&
                          !isErrorBG && (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                              <BookOpen size={10} />
                              {wc} {t("words")} · ~{mins} {t("readMin")}
                            </span>
                          )}
                        {isRecording && (
                          <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                            {AMBIENT_INFO[ambientMode].icon}
                            {AMBIENT_INFO[ambientMode].label}
                          </span>
                        )}
                      </div>
                      {uniqueSpeakers.length > 0 &&
                        !isProcessingBG &&
                        !isErrorBG && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {uniqueSpeakers.map((spk) => {
                              const style = spkStyle(spk);
                              const displayName = speakerNames[spk] || spk;
                              return (
                                <span
                                  key={spk}
                                  className={clsx(
                                    "flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border border-white/5",
                                    style.pill,
                                  )}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                                  {displayName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="px-6 pt-6 pb-3 border-b border-[var(--border)]">
                    <h1 className="text-lg font-bold text-white">
                      {t("greeting")},{" "}
                      <span className="grad-text">
                        {user?.name?.split(" ")[0]}
                      </span>{" "}
                      👋
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {t("greetingSub")}
                    </p>
                  </div>
                )}

                {/* ── AREA PRINCIPAL DIVIDIDA (TRANSCRIPCIÓN Y CHAT) ── */}
                <div
                  className="flex flex-1 min-h-0 relative"
                  style={{
                    paddingBottom: activeMeeting
                      ? "calc(var(--player) + 0px)"
                      : "0px",
                  }}
                >
                  {/* TRANSCRIPCIÓN */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {isProcessingBG && (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse animate-fade-in">
                        <Loader2
                          size={40}
                          className="animate-spin text-indigo-400 mb-4"
                        />
                        <p className="font-semibold text-white">
                          Procesando audio con IA...
                        </p>
                        <p className="text-xs mt-2 max-w-xs text-center">
                          Esto puede tardar un poco dependiendo del tamaño del
                          archivo. Puedes escuchar el audio en el reproductor de
                          abajo mientras tanto o salir de esta pantalla.
                        </p>
                      </div>
                    )}
                    {isErrorBG && (
                      <div className="flex flex-col items-center justify-center h-64 text-red-400 animate-fade-in">
                        <X size={40} className="mb-4 text-red-500 opacity-80" />
                        <p className="font-semibold">Error al transcribir</p>
                        <p className="text-xs mt-2 max-w-sm text-center opacity-80">
                          {activeMeeting.transcript
                            .replace("[ERROR]", "")
                            .trim()}
                        </p>
                      </div>
                    )}

                    {summarizing && !isProcessingBG && !isErrorBG && (
                      <div className="rounded-2xl p-5 bg-violet-500/10 border border-violet-500/20 animate-fade-in">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-violet-500/30 flex items-center justify-center">
                            <Sparkles
                              size={12}
                              className="text-violet-400 animate-pulse"
                            />
                          </div>
                          <p className="text-xs font-semibold text-violet-400">
                            {lang === "es"
                              ? "Generando resumen con IA…"
                              : "Generating AI summary…"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {[80, 60, 90, 50].map((w, i) => (
                            <div
                              key={i}
                              className="shimmer h-3 rounded-full"
                              style={{ width: `${w}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {activeMeeting?.summary &&
                      !summarizing &&
                      !isProcessingBG &&
                      !isErrorBG && (
                        <div className="rounded-2xl overflow-hidden border border-violet-500/20 animate-fade-in">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-violet-500/20 border-b border-violet-500/15">
                            <div className="flex items-center gap-2">
                              <Sparkles size={13} className="text-violet-400" />
                              <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                                {lang === "es"
                                  ? "Resumen Ejecutivo · IA"
                                  : "Executive Summary · AI"}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(activeMeeting.summary)
                                  .then(() => notify("📋 Resumen copiado"))
                              }
                              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                              title={
                                lang === "es"
                                  ? "Copiar resumen"
                                  : "Copy summary"
                              }
                            >
                              <Copy size={11} />
                              {lang === "es" ? "Copiar" : "Copy"}
                            </button>
                          </div>
                          <div className="px-4 py-4 bg-violet-500/5">
                            {activeMeeting.summary
                              .split("\n")
                              .map((line, i) => {
                                const trimmed = line.trim();
                                if (!trimmed)
                                  return <div key={i} className="h-2" />;
                                if (
                                  /^[A-ZÁÉÍÓÚÑ\s]{4,}:$/.test(trimmed) ||
                                  (trimmed.endsWith(":") && trimmed.length < 50)
                                )
                                  return (
                                    <p
                                      key={i}
                                      className="text-xs font-bold text-violet-400 uppercase tracking-wider mt-3 mb-1 first:mt-0"
                                    >
                                      {trimmed}
                                    </p>
                                  );
                                if (
                                  trimmed.startsWith("•") ||
                                  trimmed.startsWith("-")
                                )
                                  return (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2 mb-1.5"
                                    >
                                      <span className="text-violet-400 mt-1 shrink-0 text-xs">
                                        ▸
                                      </span>
                                      <p className="text-sm text-slate-300 leading-relaxed">
                                        {trimmed.replace(/^[•\-]\s*/, "")}
                                      </p>
                                    </div>
                                  );
                                return (
                                  <p
                                    key={i}
                                    className="text-sm text-slate-300 leading-relaxed mb-1.5"
                                  >
                                    {trimmed}
                                  </p>
                                );
                              })}
                          </div>
                        </div>
                      )}

                    {displayLines.length === 0 &&
                      !isRecording &&
                      !isUploading &&
                      !isProcessingBG &&
                      !isErrorBG && (
                        <div className="flex flex-col items-center justify-center h-60 text-slate-700 select-none">
                          <MessageSquareText size={48} strokeWidth={0.8} />
                          <p className="mt-3 text-sm text-slate-500 font-medium">
                            {t("noTranscript")}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {t("noTranscriptSub")}
                          </p>
                        </div>
                      )}

                    {isRecording &&
                      displayLines.length === 0 &&
                      !interimText && (
                        <div className="flex flex-col gap-2 py-3 animate-fade-in">
                          <div className="flex items-center gap-3 text-red-400 text-sm font-medium">
                            <div
                              className={clsx(
                                "flex items-end gap-px h-6",
                                isPaused && "opacity-40",
                              )}
                            >
                              {Array.from({ length: 12 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="w-1 bg-red-400/60 rounded-sm"
                                  style={{
                                    height: isPaused
                                      ? "4px"
                                      : `${4 + (audioLevel / 100) * 16 * (0.4 + Math.abs(Math.sin(i * 0.8)) * 0.6)}px`,
                                    transition: "height 0.1s",
                                  }}
                                />
                              ))}
                            </div>
                            {isPaused
                              ? lang === "es"
                                ? "Grabación pausada"
                                : "Recording paused"
                              : lang === "es"
                                ? "Grabando — habla ahora"
                                : "Recording — speak now"}
                          </div>
                          <p className="text-xs text-slate-600">
                            {lang === "es" ? "Modo: " : "Mode: "}
                            <span className="text-slate-400">
                              {AMBIENT_INFO[ambientMode].label}
                            </span>
                            {" · "}
                            {lang === "es"
                              ? "La transcripción aparecerá al pulsar Detener"
                              : "Transcription will appear when you press Stop"}
                          </p>
                        </div>
                      )}

                    {!isProcessingBG &&
                      !isErrorBG &&
                      displayLines.map((line) => {
                        const style = spkStyle(line.speaker);
                        return (
                          <div
                            key={line.id}
                            className="animate-fade-in flex gap-3"
                          >
                            <div
                              className={`w-8 h-8 rounded-full ${style.avatar} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 shadow-sm`}
                            >
                              {line.displayName[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {renamingId === line.speaker ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      if (renameValue.trim())
                                        setSpeakerNames((prev) => ({
                                          ...prev,
                                          [line.speaker]: renameValue.trim(),
                                        }));
                                      setRenamingId(null);
                                      setRenameValue("");
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <input
                                      autoFocus
                                      value={renameValue}
                                      onChange={(e) =>
                                        setRenameValue(e.target.value)
                                      }
                                      placeholder={line.displayName}
                                      className="bg-slate-800 border border-indigo-500/50 rounded px-2 py-0.5 text-xs text-white outline-none w-32"
                                    />
                                    <button
                                      type="submit"
                                      className="text-xs text-indigo-400"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRenamingId(null)}
                                      className="text-xs text-slate-500"
                                    >
                                      ✕
                                    </button>
                                  </form>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setRenamingId(line.speaker);
                                      setRenameValue(line.displayName);
                                    }}
                                    className={clsx(
                                      "text-xs font-semibold px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80",
                                      style.pill,
                                      "border-transparent",
                                    )}
                                    title={
                                      lang === "es"
                                        ? "Clic para renombrar"
                                        : "Click to rename"
                                    }
                                  >
                                    {line.displayName} ✏️
                                  </button>
                                )}
                                <span className="text-xs text-slate-700">
                                  {fmt(Math.floor(line.ts))}
                                </span>
                              </div>
                              <div
                                className={`rounded-xl rounded-tl-sm border px-3 py-2 border-l-2 ${style.bubble} ${style.border}`}
                              >
                                {editingLineId === line.id ? (
                                  <div className="flex flex-col gap-2">
                                    <textarea
                                      autoFocus
                                      value={editingLineText}
                                      onChange={(e) =>
                                        setEditingLineText(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          saveLineText(line.id);
                                        }
                                        if (e.key === "Escape")
                                          setEditingLineId(null);
                                      }}
                                      className="w-full bg-slate-900/50 border border-indigo-500/40 rounded-lg px-2.5 py-2 text-sm text-slate-200 outline-none focus:border-indigo-400 focus:bg-slate-900/80 resize-y min-h-[60px]"
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setEditingLineId(null)}
                                        className="text-xs font-medium text-slate-500 hover:text-slate-300"
                                      >
                                        {lang === "es" ? "Cancelar" : "Cancel"}
                                      </button>
                                      <button
                                        onClick={() => saveLineText(line.id)}
                                        className="text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-500/30 transition-colors"
                                      >
                                        {lang === "es" ? "Guardar" : "Save"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="group/text relative">
                                    <p className="text-sm text-slate-200 leading-relaxed pr-6 whitespace-pre-wrap">
                                      {line.displayText}
                                    </p>
                                    <button
                                      onClick={() => {
                                        setEditingLineId(line.id);
                                        setEditingLineText(line.text);
                                      }}
                                      className="absolute top-0 right-0 p-1 opacity-0 group-hover/text:opacity-100 text-slate-500 hover:text-indigo-400 transition-opacity bg-transparent"
                                      title={
                                        lang === "es"
                                          ? "Editar texto"
                                          : "Edit text"
                                      }
                                    >
                                      <Pencil size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {isRecording && interimText && !isPaused && (
                      <div className="animate-fade-in flex items-center gap-2 text-sm text-indigo-400 opacity-80 pl-11">
                        <Loader2 size={13} className="animate-spin shrink-0" />
                        <span className="italic text-xs">{interimText}</span>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* PANEL DEL CHAT IA */}
                  {isChatOpen && (
                    <div className="absolute inset-y-0 right-0 w-full sm:relative sm:w-80 md:w-96 border-l border-[var(--border)] bg-slate-950/80 flex flex-col shrink-0 animate-fade-in z-20 backdrop-blur-md">
                      <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-blue-500/10">
                        <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                          <Bot size={16} />
                          {lang === "es" ? "Chat IA" : "AI Chat"}
                        </h3>
                        <button
                          onClick={() => setIsChatOpen(false)}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMessages.length === 0 && (
                          <div className="text-center mt-6">
                            <Bot
                              size={32}
                              className="mx-auto mb-3 text-slate-600"
                            />
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {lang === "es"
                                ? 'Haz preguntas sobre esta reunión. Por ejemplo: "¿Qué decisiones se tomaron?" o "Haz una lista de tareas."'
                                : 'Ask questions about this meeting. For example: "What decisions were made?"'}
                            </p>
                          </div>
                        )}
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={clsx(
                              "flex flex-col max-w-[85%]",
                              msg.role === "user"
                                ? "ml-auto items-end"
                                : "mr-auto items-start animate-fade-in",
                            )}
                          >
                            <span className="text-[10px] text-slate-500 mb-1 px-1 font-medium">
                              {msg.role === "user"
                                ? lang === "es"
                                  ? "Tú"
                                  : "You"
                                : "Gemini"}
                            </span>
                            <div
                              className={clsx(
                                "px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                                msg.role === "user"
                                  ? "bg-blue-500 border border-blue-600 text-white rounded-2xl rounded-tr-sm"
                                  : "bg-slate-800 border border-slate-700 text-slate-300 rounded-2xl rounded-tl-sm",
                              )}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isChatting && (
                          <div className="mr-auto flex flex-col items-start max-w-[85%] animate-fade-in">
                            <span className="text-[10px] text-slate-500 mb-1 px-1 font-medium">
                              Gemini
                            </span>
                            <div className="px-3 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 rounded-tl-sm flex items-center h-9">
                              <div className="flex gap-1">
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                ></span>
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                ></span>
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                ></span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <div className="p-3 border-t border-[var(--border)] bg-slate-950">
                        <form
                          onSubmit={handleChat}
                          className="flex gap-2 relative"
                        >
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={isChatting || isProcessingBG || isErrorBG}
                            placeholder={
                              lang === "es"
                                ? "Escribe tu pregunta..."
                                : "Ask something..."
                            }
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
                          />
                          <button
                            type="submit"
                            disabled={
                              isChatting || !chatInput.trim() || isProcessingBG
                            }
                            className="absolute right-1 top-1 bottom-1 aspect-square flex items-center justify-center bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-700 hover:bg-blue-600 transition-colors"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {nav === "conversations" && (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">
                    {t("allMeetings")}
                  </h2>
                  <span className="text-xs text-slate-600 bg-slate-800 px-2.5 py-1 rounded-full">
                    {meetings.length}
                  </span>
                </div>
                {filtered.length === 0 && !loadingMeetings && (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-700">
                    <FileText size={40} strokeWidth={0.8} />
                    <p className="mt-2 text-sm text-slate-500">
                      {t("noMeetings")}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {filtered.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => openMeeting(m)}
                      className={clsx(
                        "group flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all",
                        activeMeeting?.id === m.id
                          ? "bg-indigo-500/10 border-indigo-500/30"
                          : "border-[var(--border)] hover:border-indigo-500/30 hover:bg-white/[0.02]",
                      )}
                    >
                      <div className="w-9 h-9 rounded-xl shrink-0 btn-primary flex items-center justify-center mt-0.5">
                        <Mic size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-white truncate">
                            {m.title}
                          </p>
                          {pinnedIds.has(m.id) && (
                            <Pin
                              size={11}
                              className="text-amber-400 shrink-0"
                            />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">
                          {m.transcript === "[PROCESANDO]"
                            ? "⏳ Procesando audio..."
                            : m.transcript?.startsWith("[ERROR]")
                              ? "⚠️ Error al transcribir"
                              : m.summary
                                ? m.summary.slice(0, 80) +
                                  (m.summary.length > 80 ? "…" : "")
                                : m.transcript
                                  ? m.transcript.slice(0, 80) +
                                    (m.transcript.length > 80 ? "…" : "")
                                  : lang === "es"
                                    ? "Sin transcripción"
                                    : "No transcript"}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                          <span>{fmtDate(m.created_at)}</span>
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {fmt(m.duration)}
                          </span>
                          {m.share_token && (
                            <span className="text-cyan-600 flex items-center gap-0.5">
                              <Share2 size={10} />
                              {lang === "es" ? "Compartida" : "Shared"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all md:opacity-0 opacity-100">
                        <button
                          onClick={(e) => togglePin(m.id, e)}
                          className="p-1.5 rounded-lg hover:bg-amber-500/20 text-slate-600 hover:text-amber-400 transition-all"
                        >
                          {pinnedIds.has(m.id) ? (
                            <PinOff size={13} />
                          ) : (
                            <Pin size={13} />
                          )}
                        </button>
                        <button
                          onClick={(e) => deleteMeeting(m.id, e)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* ── BOTÓN CARGAR MÁS ── */}
                {hasMore && (
                  <div className="py-8 flex justify-center">
                    <button
                      onClick={() => loadMeetings(false)}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white transition-all text-xs font-semibold"
                    >
                      {loadingMore ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      {t("loadMore")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {nav === "settings" && (
              <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-5 border-b border-[var(--border)]">
                  <h2 className="text-lg font-bold text-white">
                    {t("settings")}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === "es"
                      ? "Personaliza tu experiencia con VoiceNote AI"
                      : "Customize your VoiceNote AI experience"}
                  </p>
                </div>

                <div className="flex flex-col md:flex-row min-h-0 flex-1">
                  <nav className="w-full md:w-44 px-4 py-2 md:py-4 border-b md:border-b-0 md:border-r border-[var(--border)] flex md:flex-col gap-2 overflow-x-auto shrink-0 hide-scrollbar">
                    {SETTINGS_TABS.map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => setSettingsTab(id)}
                        className={clsx(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap",
                          settingsTab === id
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "text-slate-500 hover:text-slate-200 hover:bg-white/5",
                        )}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </nav>

                  <div className="flex-1 overflow-y-auto px-6 py-5 max-w-xl">
                    {settingsTab === "profile" && (
                      <div className="space-y-4">
                        <div className="glass rounded-2xl p-5 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl btn-primary flex items-center justify-center text-2xl font-bold shrink-0">
                            {user?.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {user?.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {user?.email}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {lang === "es"
                                ? "Miembro desde "
                                : "Member since "}
                              {user?.created_at
                                ? new Date(user.created_at).toLocaleDateString(
                                    lang === "es" ? "es-CO" : "en-US",
                                    { month: "long", year: "numeric" },
                                  )
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="glass rounded-2xl p-5">
                          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <User size={14} className="text-indigo-400" />
                            {lang === "es"
                              ? "Actualizar datos"
                              : "Update profile"}
                          </p>
                          <form
                            onSubmit={handleUpdateProfile}
                            className="space-y-3"
                          >
                            <div>
                              <label className="block text-xs text-slate-400 mb-1.5">
                                {lang === "es" ? "Nombre" : "Name"}
                              </label>
                              <input
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="input-dark"
                                placeholder={user?.name}
                              />
                            </div>
                            <div className="pt-2 border-t border-slate-800">
                              <p className="text-xs text-slate-500 mb-3">
                                {lang === "es"
                                  ? "Cambiar contraseña (opcional)"
                                  : "Change password (optional)"}
                              </p>
                              <div className="space-y-2">
                                <input
                                  type="password"
                                  value={profileCurrentPw}
                                  onChange={(e) =>
                                    setProfileCurrentPw(e.target.value)
                                  }
                                  placeholder={
                                    lang === "es"
                                      ? "Contraseña actual"
                                      : "Current password"
                                  }
                                  className="input-dark"
                                />
                                <input
                                  type="password"
                                  value={profileNewPw}
                                  onChange={(e) =>
                                    setProfileNewPw(e.target.value)
                                  }
                                  placeholder={
                                    lang === "es"
                                      ? "Nueva contraseña (min. 6)"
                                      : "New password (min. 6)"
                                  }
                                  className="input-dark"
                                />
                              </div>
                            </div>
                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold w-full justify-center disabled:opacity-40"
                            >
                              {savingProfile ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Save size={14} />
                              )}
                              {savingProfile
                                ? lang === "es"
                                  ? "Guardando…"
                                  : "Saving…"
                                : lang === "es"
                                  ? "Guardar cambios"
                                  : "Save changes"}
                            </button>
                          </form>
                        </div>

                        <div className="glass rounded-2xl p-5">
                          <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                            <Star size={14} className="text-amber-400" />
                            {lang === "es"
                              ? "Calificar la app"
                              : "Rate the app"}
                          </p>
                          <p className="text-xs text-slate-500 mb-4">
                            {lang === "es"
                              ? "¿Qué tan útil te resulta VoiceNote AI?"
                              : "How useful do you find VoiceNote AI?"}
                          </p>
                          {ratingDone ? (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm">
                              <CheckCircle2 size={16} />
                              {lang === "es"
                                ? `¡Gracias! Calificaste con ${rating} estrella${rating > 1 ? "s" : ""}.`
                                : `Thanks! You rated ${rating} star${rating > 1 ? "s" : ""}.`}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              <StarRating value={rating} onChange={setRating} />
                              <button
                                onClick={() => {
                                  if (rating > 0) setRatingDone(true);
                                }}
                                disabled={rating === 0}
                                className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold w-fit disabled:opacity-40"
                              >
                                {lang === "es"
                                  ? "Enviar calificación"
                                  : "Submit rating"}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="glass rounded-2xl p-5 border border-red-500/20">
                          <p className="text-sm font-semibold text-red-400 mb-1">
                            {lang === "es"
                              ? "⚠️ Zona de peligro"
                              : "⚠️ Danger zone"}
                          </p>
                          <p className="text-xs text-slate-500 mb-4">
                            {lang === "es"
                              ? "Eliminar tu cuenta borrará permanentemente todos tus datos, reuniones y transcripciones."
                              : "Deleting your account will permanently erase all your data, meetings and transcriptions."}
                          </p>
                          {!deleteConfirm ? (
                            <button
                              onClick={() => setDeleteConfirm(true)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all text-xs font-semibold"
                            >
                              <Trash2 size={13} />
                              {lang === "es"
                                ? "Eliminar cuenta"
                                : "Delete account"}
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-xs text-red-300 font-medium">
                                {lang === "es"
                                  ? `Escribe tu email "${user?.email}" para confirmar:`
                                  : `Type your email "${user?.email}" to confirm:`}
                              </p>
                              <input
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                                placeholder={user?.email}
                                className="input-dark border-red-500/40"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleDeleteAccount}
                                  disabled={
                                    deletingAccount ||
                                    deleteInput !== user?.email
                                  }
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-all disabled:opacity-40"
                                >
                                  {deletingAccount ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                  {lang === "es"
                                    ? "Confirmar eliminación"
                                    : "Confirm delete"}
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirm(false);
                                    setDeleteInput("");
                                  }}
                                  className="px-4 py-2 rounded-xl bg-slate-700/50 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all"
                                >
                                  {lang === "es" ? "Cancelar" : "Cancel"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={logout}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-700/40 border border-slate-600/30 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 transition-all text-sm font-medium"
                        >
                          <LogOut size={14} />
                          {lang === "es" ? "Cerrar sesión" : "Sign out"}
                        </button>
                      </div>
                    )}

                    {settingsTab === "appearance" && (
                      <div className="space-y-4">
                        <div className="glass rounded-2xl p-5">
                          <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                            <Globe size={14} className="text-indigo-400" />
                            {lang === "es"
                              ? "Idioma de la interfaz"
                              : "Interface language"}
                          </p>
                          <p className="text-xs text-slate-500 mb-4">
                            {lang === "es"
                              ? "Elige el idioma en que se muestra la aplicación"
                              : "Choose the language displayed in the app"}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(
                              [
                                ["es", "🇨🇴 Español"],
                                ["en", "🇺🇸 English"],
                              ] as [Language, string][]
                            ).map(([l, label]) => (
                              <button
                                key={l}
                                onClick={() => changeLang(l)}
                                className={clsx(
                                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all",
                                  lang === l
                                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                                    : "bg-slate-700/30 border-slate-600/30 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
                                )}
                              >
                                {label}
                                {lang === l && <CheckCircle2 size={13} />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="glass rounded-2xl p-5">
                          <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                            <Volume2 size={14} className="text-indigo-400" />
                            {lang === "es"
                              ? "Modo de captura de audio"
                              : "Audio capture mode"}
                          </p>
                          <p className="text-xs text-slate-500 mb-4">
                            {lang === "es"
                              ? "Selecciona el perfil de audio que mejor se adapta a tu entorno"
                              : "Select the audio profile that best fits your environment"}
                          </p>
                          <div className="space-y-2">
                            {(
                              [
                                "silence",
                                "noise",
                                "conference",
                              ] as AmbientMode[]
                            ).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setAmbientMode(mode)}
                                className={clsx(
                                  "flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left",
                                  ambientMode === mode
                                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                                    : "bg-slate-700/20 border-slate-700/40 text-slate-400 hover:bg-slate-700/40",
                                )}
                              >
                                <div
                                  className={clsx(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    ambientMode === mode
                                      ? "bg-indigo-500/30"
                                      : "bg-slate-700/60",
                                  )}
                                >
                                  {AMBIENT_INFO[mode].icon}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">
                                    {AMBIENT_INFO[mode].label}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {AMBIENT_INFO[mode].desc}
                                  </p>
                                </div>
                                {ambientMode === mode && (
                                  <CheckCircle2
                                    size={15}
                                    className="text-indigo-400 shrink-0"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === "about" && (
                      <div className="space-y-4">
                        <div className="glass rounded-2xl p-6 text-center">
                          <div className="w-16 h-16 rounded-2xl btn-primary flex items-center justify-center mx-auto mb-3">
                            <Mic size={28} />
                          </div>
                          <h3 className="text-xl font-bold grad-text">
                            VoiceNote AI
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">v5.0.0</p>
                          <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-xs mx-auto">
                            {lang === "es"
                              ? "Plataforma de transcripción y análisis de reuniones potenciada por IA de última generación."
                              : "Meeting transcription and analysis platform powered by cutting-edge AI."}
                          </p>
                        </div>

                        <div className="glass rounded-2xl p-5">
                          <p className="text-sm font-semibold text-white mb-3">
                            {lang === "es"
                              ? "🛠 Tecnologías"
                              : "🛠 Technologies"}
                          </p>
                          <div className="space-y-2">
                            {[
                              [
                                "🚀",
                                "Groq + Whisper Large v3",
                                lang === "es"
                                  ? "Transcripción en tiempo real"
                                  : "Real-time transcription",
                              ],
                              [
                                "🤖",
                                "Claude AI / Gemini",
                                lang === "es"
                                  ? "Resúmenes ejecutivos y Chat"
                                  : "Executive summaries and Chat",
                              ],
                              [
                                "⚡",
                                "Next.js 15 + React 19",
                                lang === "es"
                                  ? "Interfaz moderna"
                                  : "Modern interface",
                              ],
                              [
                                "🔒",
                                "FastAPI + PostgreSQL",
                                lang === "es"
                                  ? "Backend seguro y escalable"
                                  : "Secure and scalable backend",
                              ],
                              [
                                "🐳",
                                "Docker Compose",
                                lang === "es"
                                  ? "Despliegue simplificado"
                                  : "Simplified deployment",
                              ],
                            ].map(([icon, name, desc]) => (
                              <div
                                key={name}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60"
                              >
                                <span className="text-base shrink-0">
                                  {icon}
                                </span>
                                <div>
                                  <p className="text-xs font-semibold text-white">
                                    {name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {desc}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="glass rounded-2xl p-5">
                          <p className="text-sm font-semibold text-white mb-3">
                            {lang === "es"
                              ? "✅ Funcionalidades"
                              : "✅ Features"}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              lang === "es"
                                ? "🎙 Grabación en vivo"
                                : "🎙 Live recording",
                              lang === "es"
                                ? "📁 Subida de archivos"
                                : "📁 File upload",
                              lang === "es"
                                ? "💬 Chat IA con la Reunión"
                                : "💬 AI Meeting Chat",
                              lang === "es"
                                ? "✨ Resúmenes IA"
                                : "✨ AI summaries",
                              lang === "es"
                                ? "📄 Exportar PDF / Word"
                                : "📄 Export PDF / Word",
                              lang === "es"
                                ? "🔗 Links compartidos"
                                : "🔗 Share links",
                              lang === "es"
                                ? "👥 Identificación hablantes"
                                : "👥 Speaker diarization",
                              lang === "es"
                                ? "🧹 Limpiar texto"
                                : "🧹 Clean text",
                            ].map((f) => (
                              <div
                                key={f}
                                className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/40 px-3 py-2 rounded-lg"
                              >
                                {f}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="glass rounded-2xl p-5">
                          <p className="text-sm font-semibold text-white mb-3">
                            {lang === "es"
                              ? "📊 Tu actividad"
                              : "📊 Your activity"}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              {
                                val: meetings.length,
                                label: lang === "es" ? "Reuniones" : "Meetings",
                              },
                              {
                                val: `${totalHours}h`,
                                label: lang === "es" ? "Grabadas" : "Recorded",
                              },
                              {
                                val: meetings.filter((m) => m.summary).length,
                                label:
                                  lang === "es" ? "Resumidas" : "Summarized",
                              },
                            ].map(({ val, label }) => (
                              <div
                                key={label}
                                className="text-center bg-slate-800/40 rounded-xl p-3"
                              >
                                <p className="text-2xl font-bold grad-text">
                                  {val}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {label}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ── Player bar ────────────────────────────────────────────────────── */}
        {activeMeeting && (
          <div
            className="absolute bottom-0 right-0 left-0 md:left-[var(--sidebar)] flex items-center gap-2 md:gap-4 px-3 md:px-5 border-t border-[var(--border)] z-30"
            style={{
              height: "var(--player)",
              background: "rgba(10,10,15,0.97)",
              backdropFilter: "blur(20px)",
            }}
          >
            <button
              onClick={() => {
                if (!wavesurferRef.current || !hasAudio) return;
                wavesurferRef.current.playPause();
              }}
              disabled={isRecording || !hasAudio}
              className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
                isRecording || !hasAudio
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                  : "btn-primary",
              )}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <div className="flex items-center gap-2 min-w-0 w-32 md:w-44 shrink-0">
              {isRecording ? (
                <div
                  className={clsx(
                    "flex items-end gap-px h-5 w-8",
                    isPaused && "opacity-40",
                  )}
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-red-400 rounded-sm"
                      style={{
                        height: isPaused
                          ? "2px"
                          : `${Math.max(2, (audioLevel / 100) * 18 * (0.3 + Math.abs(Math.sin(i)) * 0.7))}px`,
                        transition: "height 0.1s",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Mic size={12} className="text-slate-600 shrink-0" />
              )}
              <span className="text-xs text-slate-400 font-medium truncate">
                {activeMeeting.title}
              </span>
            </div>

            <div className="flex-1 flex items-center gap-2.5 min-w-0">
              <span className="text-xs text-slate-600 tabular-nums shrink-0">
                {fmt(isRecording ? elapsed : playhead)}
              </span>

              {/* ── CONTENEDOR DEL WAVEFORM DE WAVESURFER ── */}
              <div
                className={clsx(
                  "flex-1 h-[24px] relative hidden sm:block cursor-pointer",
                  isRecording && "!hidden",
                )}
                ref={waveformRef}
              />

              {/* ── BARRA DE PROGRESO FALSA DURANTE LA GRABACIÓN EN VIVO ── */}
              {isRecording && (
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden hidden sm:block"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-1000",
                      isPaused
                        ? "bg-amber-400 opacity-50"
                        : "bg-gradient-to-r from-indigo-500 to-violet-500",
                    )}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              <span className="text-xs text-slate-600 tabular-nums shrink-0 hidden sm:block">
                {fmt(isRecording ? elapsed : activeMeeting.duration)}
              </span>
            </div>
            <div className="shrink-0 text-xs text-slate-600 flex items-center gap-1 hidden md:flex">
              <MessageSquareText size={11} />
              {transcript.filter((l) => l.final).length}{" "}
              {lang === "es" ? "líneas" : "lines"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
