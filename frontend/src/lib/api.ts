export type CrowdingStatus = 'green' | 'yellow' | 'red';
export type MarkerType = 'poi' | 'activity' | 'event';
export type UserRole = 'anonymous' | 'registered_user' | 'certified_entity' | 'municipal_admin' | 'system_admin';

export interface ApiEvent {
  id: string;
  title: string;
  description: string;
  location: string | null;
  dateTime: string | null;
  isCertified: boolean;
  category: string;
  createdAt: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ApiActivity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  participantCount: number;
  maxParticipants: number;
  createdAt: string | null;
  dateTime?: string | null;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MapMarker {
  id: string;
  type: MarkerType;
  title: string;
  latitude: number;
  longitude: number;
  crowdingStatus: CrowdingStatus;
  isCertified: boolean;
  sourceId: string;
}

export interface CurrentUser {
  id: string | null;
  name: string;
  email: string | null;
  role: UserRole;
  roleLabel?: string;
  avatar: string;
  ruolo?: string;
  interessi?: string[];
  nomeEnte?: string | null;
  approvato?: boolean;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    nome: string;
    cognome: string;
    ruolo: string;
    interessi?: string[];
    nomeEnte?: string | null;
    approvato?: boolean;
  };
  token: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalActivities: number;
  totalEvents: number;
  totalPOIs: number;
  totalParticipations: number;
  activitiesByType: Array<{ tipo: string; count: number }>;
  poiCrowding: Array<{ statoAffollamento: string; count: number }>;
}

interface EventsResponse { events: ApiEvent[]; total?: number; }
interface ActivitiesResponse { activities: ApiActivity[]; total?: number; }
interface MapResponse { markers: MapMarker[]; }

export class ApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TOKEN_KEY = 'tla_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* localStorage may be unavailable */ }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  raw?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('API non disponibile. Verifica che il backend sia avviato.');
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  if (!opts.raw) {
    try { payload = await response.json(); } catch { /* ignore */ }
  }

  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    throw new ApiError(
      typeof body.error === 'string' ? body.error : `Errore ${response.status}`,
      response.status,
      typeof body.code === 'string' ? body.code : undefined,
    );
  }
  return (opts.raw ? response : payload) as T;
}

function arrayFromPayload<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }
  throw new ApiError(`Risposta API malformata: campo "${key}" mancante.`);
}

// ============================== Public data ==============================

export async function getEvents(params?: { q?: string; categoria?: string }): Promise<ApiEvent[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
  const payload = await request<EventsResponse | ApiEvent[]>(`/api/events${qs}`);
  return arrayFromPayload<ApiEvent>(payload, 'events');
}
export function getEventById(id: string): Promise<ApiEvent> {
  return request<ApiEvent>(`/api/events/${encodeURIComponent(id)}`);
}
export async function getActivities(params?: { q?: string; tipo?: string }): Promise<ApiActivity[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
  const payload = await request<ActivitiesResponse | ApiActivity[]>(`/api/activities${qs}`);
  return arrayFromPayload<ApiActivity>(payload, 'activities');
}
export function getActivityById(id: string): Promise<ApiActivity> {
  return request<ApiActivity>(`/api/activities/${encodeURIComponent(id)}`);
}
export async function getMapMarkers(): Promise<MapMarker[]> {
  const payload = await request<MapResponse | MapMarker[]>('/api/map');
  return arrayFromPayload<MapMarker>(payload, 'markers');
}
export function getCurrentUser(): Promise<CurrentUser> {
  return request<CurrentUser>('/api/users/me');
}

// ============================== Auth ==============================

export async function login(email: string, password: string, otpToken?: string): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password, otpToken },
    auth: false,
  });
  setToken(result.token);
  return result;
}
export interface RegisterPayload {
  email: string; password: string; nome: string; cognome: string; dataNascita: string;
  consents: { privacy_policy: boolean; terms_of_service: boolean; marketing?: boolean; analytics?: boolean; };
}
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/auth/register', { method: 'POST', body: payload, auth: false });
  setToken(result.token);
  return result;
}
export interface RegisterEntityPayload {
  email: string; password: string; nomeEnte: string; nome?: string; cognome?: string;
}
export function registerEntity(payload: RegisterEntityPayload): Promise<{ message: string; userId: string }> {
  return request('/auth/register/entity', { method: 'POST', body: payload, auth: false });
}
export function forgotPassword(email: string): Promise<{ message: string }> {
  return request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}
export function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return request(`/auth/reset-password/${encodeURIComponent(token)}`, { method: 'POST', body: { password }, auth: false });
}
export async function logout(): Promise<void> {
  try { await request('/auth/logout', { method: 'POST' }); } finally { setToken(null); }
}
export function getMe(): Promise<CurrentUser & { id: string }> {
  return request('/auth/me');
}
export function updateProfile(data: { nome?: string; cognome?: string; interessi?: string[] }): Promise<CurrentUser> {
  return request('/auth/me', { method: 'PUT', body: data });
}
export function deleteAccount(): Promise<void> {
  return request('/auth/me', { method: 'DELETE' });
}
export function updateLocation(lat: number, lng: number): Promise<{ lat: number; lng: number }> {
  return request('/auth/me/location', { method: 'PUT', body: { lat, lng } });
}

// ============================== Activities (write) ==============================

export interface CreateActivityPayload {
  tipo: string; data: string; orarioInizio: string; orarioFine: string;
  maxPartecipanti: number; latitudine?: number; longitudine?: number; poiId?: string;
}
export function createActivity(payload: CreateActivityPayload): Promise<ApiActivity> {
  return request('/activities', { method: 'POST', body: payload });
}
export function joinActivity(activityId: string): Promise<ApiActivity> {
  return request(`/activities/${encodeURIComponent(activityId)}/join`, { method: 'POST' });
}
export function leaveActivity(activityId: string): Promise<void> {
  return request(`/activities/${encodeURIComponent(activityId)}/join`, { method: 'DELETE' });
}
export function cancelActivity(activityId: string): Promise<void> {
  return request(`/activities/${encodeURIComponent(activityId)}`, { method: 'DELETE' });
}

// ============================== Events (write) ==============================

export interface CreateEventPayload {
  titolo: string; descrizione: string; categoria: string;
  data?: string; orarioInizio?: string; orarioFine?: string;
  latitudine?: number; longitudine?: number; poiId?: string;
}
export function createEvent(payload: CreateEventPayload): Promise<ApiEvent> {
  return request('/events', { method: 'POST', body: payload });
}
export function getMyEvents(): Promise<{ events: ApiEvent[] }> {
  return request('/events/mine');
}
export function getEventStats(eventId: string): Promise<{ eventId: string; titolo: string; views: number; reports: number }> {
  return request(`/events/${encodeURIComponent(eventId)}/stats`);
}

// ============================== Dashboard (municipal admin) ==============================

export function getDashboardStats(params?: Record<string, string | number>): Promise<DashboardStats & { filters?: unknown }> {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}` : '';
  return request(`/dashboard/stats${qs}`);
}
export function getDashboardExportUrl(format: 'csv' | 'pdf', params?: Record<string, string | number>): string {
  const allParams = { ...(params || {}), format };
  const qs = new URLSearchParams(Object.entries(allParams).map(([k, v]) => [k, String(v)])).toString();
  return `${API_BASE_URL}/dashboard/stats/export?${qs}`;
}

// ============================== Admin ==============================

export interface PendingEntity {
  id: string; email: string; nome: string; nomeEnte: string; createdAt: string;
}
export function getPendingEntities(): Promise<PendingEntity[]> {
  return request('/admin/entities/pending');
}
export function approveEntity(id: string): Promise<{ message: string }> {
  return request(`/admin/entities/${encodeURIComponent(id)}/approve`, { method: 'PATCH' });
}
export function rejectEntity(id: string): Promise<{ message: string }> {
  return request(`/admin/entities/${encodeURIComponent(id)}/reject`, { method: 'PATCH' });
}

export interface AdminUser {
  id: string; email: string; nome: string; cognome: string;
  ruolo: string; approvato?: boolean; nomeEnte?: string | null; createdAt: string;
}
export function getAdminUsers(): Promise<AdminUser[]> {
  return request('/admin/users');
}
export function deleteAdminUser(id: string): Promise<void> {
  return request(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export interface POI {
  id: string; nome: string; latitudine: number; longitudine: number;
  capacitaMax: number; statoAffollamento: string; tipo?: string; descrizione?: string;
}
export function getPOIs(): Promise<POI[]> {
  return request('/map/poi', { auth: false });
}
export function createPOI(payload: Partial<POI>): Promise<POI> {
  return request('/map/poi', { method: 'POST', body: payload });
}
export function updatePOI(id: string, payload: Partial<POI>): Promise<POI> {
  return request(`/map/poi/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
}
export function deletePOI(id: string): Promise<void> {
  return request(`/map/poi/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ============================== Moderation ==============================

export interface Report {
  id: string; userId: string; eventId: string;
  tipo: string; stato: string; descrizione?: string; createdAt: string;
  event?: { id: string; titolo: string };
}
export function reportEvent(eventId: string, tipo: string, descrizione?: string): Promise<Report> {
  return request(`/moderation/events/${encodeURIComponent(eventId)}/report`, { method: 'POST', body: { tipo, descrizione } });
}
export function getReports(stato?: string): Promise<{ reports: Report[] }> {
  const qs = stato ? `?stato=${encodeURIComponent(stato)}` : '';
  return request(`/moderation/reports${qs}`);
}
export function resolveReport(id: string, azione: 'rimuovi' | 'archivia' | 'in_lavorazione'): Promise<{ message: string }> {
  return request(`/moderation/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: { azione } });
}
