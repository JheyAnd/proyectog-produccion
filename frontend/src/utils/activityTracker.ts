/**
 * activityTracker.ts
 * Tracks active user sessions and edit history.
 * Activity log is persisted server-side at /api/v1/activity.
 * localStorage is kept as a fast read cache for the same session.
 */
import { useAuthStore, type User } from '../stores/authStore';
import apiClient from '../services/api/client';

const LS_SESSIONS_KEY = 'pcm_active_sessions';
const LS_ACTIVITY_KEY = 'pcm_activity_log';
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const MAX_LOG_ENTRIES = 150;

export interface ActiveSession {
  userId: string;
  userName: string;
  userRole: string;
  currentPage: string;
  lastSeen: string; // ISO
}

export interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  module?: string;
  page: string;
  action: string;
  before?: string;
  after?: string;
  link?: string;
  timestamp: string; // ISO
}

/** Update the current user's presence record (call every ~30s). */
export function updatePresence(user: User, currentPage: string): void {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    const sessions: Record<string, ActiveSession> = raw ? JSON.parse(raw) : {};
    sessions[user.id] = {
      userId: user.id,
      userName: user.full_name,
      userRole: user.role,
      currentPage,
      lastSeen: new Date().toISOString(),
    };
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
  } catch { /* ignore */ }
}

/** Remove the current user from active sessions (call on logout). */
export function clearPresence(userId: string): void {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    const sessions: Record<string, ActiveSession> = raw ? JSON.parse(raw) : {};
    delete sessions[userId];
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
  } catch { /* ignore */ }
}

/** Get all sessions active within the last SESSION_TIMEOUT_MS. */
export function getActiveSessions(): ActiveSession[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    if (!raw) return [];
    const sessions: Record<string, ActiveSession> = JSON.parse(raw);
    const cutoff = Date.now() - SESSION_TIMEOUT_MS;
    return Object.values(sessions)
      .filter((s) => new Date(s.lastSeen).getTime() > cutoff)
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  } catch { return []; }
}

/** Record an edit action performed by a user.
 *  Saves to localStorage immediately (for fast same-tab reads)
 *  and fires a non-blocking POST to the server for persistence. */
export function logEdit(
  user: User, 
  page: string, 
  action: string, 
  extra?: { module?: string; before?: any; after?: any; link?: string }
): void {
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId: user.id,
    userName: user.full_name,
    userRole: user.role,
    module: extra?.module,
    page,
    action,
    before: extra?.before ? (typeof extra.before === 'string' ? extra.before : JSON.stringify(extra.before)) : undefined,
    after: extra?.after ? (typeof extra.after === 'string' ? extra.after : JSON.stringify(extra.after)) : undefined,
    link: extra?.link,
    timestamp: new Date().toISOString(),
  };

  // 1. Write to localStorage cache immediately
  try {
    const raw = localStorage.getItem(LS_ACTIVITY_KEY);
    const log: ActivityEntry[] = raw ? JSON.parse(raw) : [];
    log.unshift(entry);
    if (log.length > MAX_LOG_ENTRIES) log.splice(MAX_LOG_ENTRIES);
    localStorage.setItem(LS_ACTIVITY_KEY, JSON.stringify(log));
  } catch { /* ignore */ }

  // 2. Persist to server (fire-and-forget) using apiClient
  apiClient.post('/activity', entry).catch(() => { /* ignore network errors */ });
}

/** Get the most recent edit entries from the server (newest first).
 *  Falls back to localStorage cache if the server is unavailable. */
export async function getActivityLogFromServer(limit = 100): Promise<ActivityEntry[]> {
  const isLoggedIn = !!useAuthStore.getState().token;
  if (!isLoggedIn) {
    return getActivityLog(limit);
  }

  try {
    const res = await apiClient.get<ActivityEntry[]>(`/activity?limit=${limit}`);
    const data = res.data;
    // Update localStorage cache with server data
    try {
      localStorage.setItem(LS_ACTIVITY_KEY, JSON.stringify(data.slice(0, MAX_LOG_ENTRIES)));
    } catch { /* ignore */ }
    return data;
  } catch {
    // Fallback to localStorage cache
    return getActivityLog(limit);
  }
}

/** Get the most recent edit entries from localStorage cache (newest first). */
export function getActivityLog(limit = 50): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(LS_ACTIVITY_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as ActivityEntry[]).slice(0, limit);
  } catch { return []; }
}
