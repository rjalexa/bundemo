// ── Database ────────────────────────────────────────────────────────

export interface Note {
  id: number;
  title: string;
  content: string;
  tags: string; // JSON array stored as text in SQLite
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
}

// ── WebSocket ───────────────────────────────────────────────────────

export interface WebSocketData {
  id: string;
  connectedAt: number;
  userId?: number;
  email?: string;
}

export type WsMessageType = "welcome" | "echo" | "broadcast";

export interface WsMessage {
  type: WsMessageType;
  from?: string;
  id?: string;
  message: string;
  clients?: number;
  timestamp?: number;
}

// ── Workers ─────────────────────────────────────────────────────────

export type WorkerTask = "fibonacci" | "primes" | "pi";

export interface WorkerRequest {
  id: string;
  task: WorkerTask;
  payload: number;
}

export interface WorkerResponse {
  id: string;
  task: WorkerTask;
  result: unknown;
  timeMs: number;
  thread: string;
  error?: string;
}

// ── Auth ────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface UserPublic {
  id: number;
  email: string;
  created_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserPublic;
}

// ── API ─────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  runtime: string;
  uptime: string;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
  timestamp: string;
}

export interface NotesListResponse {
  notes: Note[];
  total: number;
}

export interface HashResult {
  hash: string;
  algorithm: string;
  timeMs: number;
}

export interface VerifyResult {
  match: boolean;
  timeMs: number;
}
