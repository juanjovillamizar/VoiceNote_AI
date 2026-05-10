// lib/api.ts — API helpers with robust error handling

export const TOKEN_KEY = "vn_token";

export function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

// ── Core request helper ────────────────────────────────────────────────────────

const BASE = "/api";

async function req<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const t = token ?? getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  let res: Response;

  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch (networkErr: unknown) {
    const msg =
      networkErr instanceof Error ? networkErr.message : "Sin conexión";
    throw new Error(
      `Error de red: ${msg}. Verifica que Docker esté corriendo con 'docker compose ps'.`,
    );
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    let detail = `Error HTTP ${res.status}`;

    if (contentType.includes("application/json")) {
      try {
        const body = await res.json();
        if (typeof body.detail === "string") {
          detail = body.detail;
        } else if (Array.isArray(body.detail)) {
          detail = body.detail.map((e: { msg: string }) => e.msg).join(", ");
        } else if (body.message) {
          detail = body.message;
        } else {
          detail = JSON.stringify(body);
        }
      } catch {
        detail = `Error HTTP ${res.status} (respuesta no válida)`;
      }
    } else {
      try {
        const text = await res.text();
        detail = text.slice(0, 200) || `Error HTTP ${res.status}`;
      } catch {
        detail = `Error HTTP ${res.status}`;
      }
    }

    throw new Error(detail);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export const apiRegister = (name: string, email: string, password: string) =>
  req<{ access_token: string; user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const apiLogin = (email: string, password: string) =>
  req<{ access_token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const apiMe = () => req<User>("/auth/me");

export const apiUpdateProfile = (data: {
  name?: string;
  current_password?: string;
  new_password?: string;
}) =>
  req<User>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const apiDeleteAccount = () =>
  req<void>("/auth/account", { method: "DELETE" });

// ── Meetings ───────────────────────────────────────────────────────────────────

export const apiFetchMeetings = (skip: number = 0, limit: number = 15) =>
  req<Meeting[]>(`/meetings?skip=${skip}&limit=${limit}`);

export const apiCreateMeeting = (data: {
  title: string;
  transcript: string;
  duration: number;
}) => req<Meeting>("/meetings", { method: "POST", body: JSON.stringify(data) });

export const apiUpdateMeeting = (
  id: number,
  data: Partial<{
    title: string;
    transcript: string;
    summary: string;
    duration: number;
  }>,
) =>
  req<Meeting>(`/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const apiDeleteMeeting = (id: number) =>
  req<void>(`/meetings/${id}`, { method: "DELETE" });

export const apiShareMeeting = (id: number) =>
  req<{ share_token: string }>(`/meetings/${id}/share`, { method: "POST" });

export const apiSummarizeMeeting = (id: number) =>
  req<{ summary: string }>(`/meetings/${id}/summarize`, { method: "POST" });

export const apiGetShared = (token: string) =>
  req<Meeting>(`/share/${token}`, {}, "");

// ── AI Chat ────────────────────────────────────────────────────────────────────
export const apiChatWithMeeting = (id: number, query: string) =>
  req<{ answer: string }>(`/meetings/${id}/chat`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });

// ── Donaciones (Mercado Pago) ──────────────────────────────────────────────────
export const apiCreateDonation = (amount: number) =>
  req<{ preference_id: string }>("/donate", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

// ── Health check ───────────────────────────────────────────────────────────────

export async function apiHealthCheck(): Promise<{
  ok: boolean;
  detail: string;
}> {
  try {
    const res = await fetch("/api/health");
    if (res.ok) {
      const data = await res.json();
      return { ok: true, detail: `API v${data.version ?? "?"} ✓` };
    }
    return { ok: false, detail: `Backend respondió con ${res.status}` };
  } catch (e: unknown) {
    return {
      ok: false,
      detail:
        e instanceof Error
          ? `Sin conexión — ${e.message}`
          : "Backend no disponible",
    };
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Meeting {
  id: number;
  title: string;
  transcript: string;
  summary: string;
  duration: number;
  share_token: string | null;
  created_at: string;
}
