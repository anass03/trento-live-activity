export type CrowdingStatus = 'green' | 'yellow' | 'orange' | 'red';
export type MarkerType = 'poi' | 'activity' | 'event' | 'parking';
export type UserRole = 'anonymous' | 'registered_user' | 'certified_entity' | 'municipal_admin' | 'system_admin';

export interface ApiEvent {
  id: string;
  title: string;
  description: string;
  location: string | null;
  dateTime: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isCertified: boolean;
  category: string;
  createdAt: string | null;
  latitude?: number | null;
  longitude?: number | null;
  maxPartecipanti?: number | null;
  participantCount?: number;
  participantIds?: string[];
  entity?: { id: string; name: string } | null;
}


export interface ApiActivity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  participantCount: number;
  participantIds?: string[];
  maxParticipants: number;
  createdAt: string | null;
  dateTime?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  creator?: { id: string; name: string } | null;
}

export interface MapMarker {
  id: string;
  type: MarkerType;
  title: string;
  latitude: number;
  longitude: number;
  crowdLevel: number;
  crowdingStatus: CrowdingStatus;
  isCertified: boolean;
  sourceId: string;
  category?: string | null;
  description?: string | null;
  dateTime?: string | null;
  // Solo per i marker di tipo 'parking': posti liberi / totali.
  free?: number | null;
  total?: number | null;
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
  needs2faSetup?: boolean;
  recoveryUsed?: boolean;
  recoveryCodesRemaining?: number;
}

export interface Setup2FAResponse {
  otpauthUrl: string;
  base32: string;
}
export interface Verify2FAResponse {
  message: string;
  token: string;
  user: AuthResponse['user'];
  recoveryCodes: string[];
}
export interface RecoveryCodesResponse {
  recoveryCodes: string[];
}

export interface DashboardStats {
  // RIMOSSO totalUsers per scope ridotto (#15) — il Comune vede solo aggregati.
  totalUsers?: never;
  totalActivities: number;
  totalEvents: number;
  totalPOIs: number;
  totalParticipations: number;
  activitiesByType: Array<{ tipo: string; count: number }>;
  eventsByCategory?: Array<{ categoria: string; count: number }>;
  poiCrowding: Array<{ statoAffollamento: string; count: number }>;
  topCrowdedPOIs?: Array<{ id: string; nome: string; tipo: string | null; statoAffollamento: string; capacitaMax: number }>;
  // New: demand/supply, time-series
  poiByType?: Array<{ tipo: string | null; count: number }>;
  activitiesByDay?: Array<{ date: string; count: number }>;
  activitiesByHour?: Array<{ hour: string; count: number }>;
}

export type ServiceRequestCategory =
  | 'parcheggio_auto' | 'parcheggio_bici' | 'sport' | 'studio'
  | 'verde' | 'cultura' | 'ciclismo' | 'altro';

export interface ServiceRequestStats {
  byCategory: Array<{ categoria: string; count: number }>;
  total: number;
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
  // Notifica i listener che l'identità è cambiata (login o logout).
  // App.tsx::fetchUser ricarica lo stato utente in risposta.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tla:user-updated'));
  }
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

export async function getEvents(params?: { q?: string; categoria?: string; page?: number; limit?: number }): Promise<ApiEvent[]> {
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
  const payload = await request<EventsResponse | ApiEvent[]>(`/api/events${qs}`);
  return arrayFromPayload<ApiEvent>(payload, 'events');
}
export function getEventById(id: string): Promise<ApiEvent> {
  return request<ApiEvent>(`/api/events/${encodeURIComponent(id)}`);
}
export function joinEvent(id: string): Promise<{ eventId: string; joined: true; participantCount: number; maxPartecipanti: number | null }> {
  return request(`/api/events/${encodeURIComponent(id)}/participate`, { method: 'POST' });
}
export function leaveEvent(id: string): Promise<{ eventId: string; joined: false; participantCount: number }> {
  return request(`/api/events/${encodeURIComponent(id)}/participate`, { method: 'DELETE' });
}
export async function getActivities(params?: { q?: string; tipo?: string; page?: number; limit?: number; mine?: 'interests' }): Promise<ApiActivity[]> {
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
// ============================== Auth ==============================

export async function login(email: string, password: string, otpToken?: string): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password, otpToken },
    auth: false,
  });
  setToken(result.token);
  return result;
}
export interface RegisterPayload {
  email: string; password: string; nome: string; cognome: string; dataNascita: string;
  codiceFiscale: string;
  consents: { privacy_policy: boolean; terms_of_service: boolean; marketing?: boolean; analytics?: boolean; };
}
export type RegisterResponse = AuthResponse | { emailVerificationRequired: boolean };
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const result = await request<RegisterResponse>('/api/auth/register', { method: 'POST', body: payload, auth: false });
  if ('token' in result && result.token) setToken(result.token);
  return result;
}
export interface RegisterEntityPayload {
  email: string; password: string; nomeEnte: string; pec: string;
  nome?: string; cognome?: string;
  // #M6: il backend ora richiede consenso esplicito privacy + ToS anche per gli enti.
  consents: { privacy_policy: boolean; terms_of_service: boolean; marketing?: boolean; analytics?: boolean; };
}
export function registerEntity(payload: RegisterEntityPayload): Promise<{ message: string; userId: string }> {
  return request('/api/auth/register/entity', { method: 'POST', body: payload, auth: false });
}
export function forgotPassword(email: string): Promise<{ message: string }> {
  return request('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}
export function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return request(`/api/auth/reset-password/${encodeURIComponent(token)}`, { method: 'POST', body: { password }, auth: false });
}
export async function logout(): Promise<void> {
  // setToken(null) viene chiamato comunque nel finally, anche se la richiesta
  // al backend fallisce (rete offline, token già revocato, ecc.).
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    /* ignore: il logout deve riuscire lato client comunque */
  } finally {
    setToken(null);
  }
}
export interface MeProfileCittadino {
  kind: 'cittadino';
  nome?: string; cognome?: string; dataNascita?: string;
  codiceFiscale?: string; interessi: string[];
  onboardingComplete: boolean;
}
export interface MeProfileEnte {
  kind: 'ente';
  nomeEnte?: string; pec?: string; approvato?: boolean; noteAdmin?: string;
}
export interface MeProfileComunale {
  kind: 'comunale';
  nome?: string; cognome?: string; ufficio?: string; spidId?: string;
}
export interface MeProfileSistema {
  kind: 'sistema';
  nome?: string; cognome?: string; superAdmin?: boolean;
}
export type MeProfile = MeProfileCittadino | MeProfileEnte | MeProfileComunale | MeProfileSistema;

export function updateEnteProfile(payload: { noteAdmin?: string }): Promise<{ noteAdmin: string | null }> {
  return request('/api/auth/me/ente', { method: 'PATCH', body: payload });
}
export function completeOnboarding(payload: { interessi: string[] }): Promise<{ interessi: string[]; onboardingComplete: true }> {
  return request('/api/auth/me/onboarding', { method: 'POST', body: payload });
}

export function getSuggestedInterests(picked: string[]): Promise<{ suggestions: string[] }> {
  const qs = picked.length ? `?picked=${encodeURIComponent(picked.join(','))}` : '';
  return request(`/api/auth/suggested-interests${qs}`);
}

// ============================== AI suggester ==============================

export interface AiActivitySuggestion {
  tipo: string;
  data: string;
  maxPartecipanti: number;
  orarioInizio: string;
  orarioFine: string;
  reasoning: string;
}
export function suggestActivityAi(payload: { description: string; location?: string; time?: string }): Promise<AiActivitySuggestion> {
  return request('/api/ai/suggest-activity', { method: 'POST', body: payload });
}

// ============================== Social OAuth ==============================

export async function oauthGoogleLogin(accessToken: string): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/api/auth/oauth/google', { method: 'POST', body: { accessToken }, auth: false });
  setToken(result.token);
  return result;
}
export async function oauthAppleLogin(idToken: string): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/api/auth/oauth/apple', { method: 'POST', body: { idToken }, auth: false });
  setToken(result.token);
  return result;
}
// ============================== Consensi ==============================

export type ConsentType =
  | 'privacy_policy' | 'terms_of_service' | 'marketing' | 'analytics'
  | 'notif_email' | 'notif_push';

export interface ConsentRecord {
  id: string;
  userId: string;
  type: ConsentType;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  version: string;
  createdAt: string;
}
export function listConsents(): Promise<ConsentRecord[]> {
  return request('/api/auth/consents');
}
export function updateConsent(type: ConsentType, granted: boolean): Promise<ConsentRecord> {
  return request('/api/auth/consents', { method: 'POST', body: { type, granted } });
}

// Riassume lo stato corrente di ciascun consenso dato il log (l'ultimo record vince)
export function summarizeConsents(records: ConsentRecord[]): Partial<Record<ConsentType, boolean>> {
  const out: Partial<Record<ConsentType, boolean>> = {};
  for (const r of records) {
    if (!(r.type in out)) out[r.type] = r.granted;
  }
  return out;
}

export async function spidLoginStub(payload: { spidId: string; nome: string; cognome: string; email: string; ufficio?: string }): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/api/auth/spid/callback', { method: 'POST', body: payload, auth: false });
  setToken(result.token);
  return result;
}

// ============================== Favorites ==============================

export type FavoriteType = 'poi' | 'activity' | 'event';
export interface ApiFavorite {
  id: string; userId: string; markerType: FavoriteType; markerId: string; createdAt: string;
}
export function getFavorites(): Promise<ApiFavorite[]> {
  return request('/api/users/me/favorites');
}
export function addFavorite(markerType: FavoriteType, markerId: string): Promise<ApiFavorite> {
  return request('/api/users/me/favorites', { method: 'POST', body: { markerType, markerId } });
}
export function removeFavorite(markerType: FavoriteType, markerId: string): Promise<void> {
  const qs = `?markerType=${encodeURIComponent(markerType)}&markerId=${encodeURIComponent(markerId)}`;
  return request(`/api/users/me/favorites${qs}`, { method: 'DELETE' });
}

export function getMe(): Promise<CurrentUser & { id: string; profile: MeProfile | null }> {
  return request('/api/auth/me');
}
export function updateProfile(data: { nome?: string; cognome?: string; interessi?: string[] }): Promise<CurrentUser> {
  return request('/api/auth/me', { method: 'PUT', body: data });
}
// #M7: il backend ora richiede currentPassword (account con password) o
// confirmEmail="DELETE <email>" (account OAuth-only) per impedire che un JWT
// rubato basti a cancellare l'account.
export function deleteAccount(payload: { currentPassword?: string; confirmEmail?: string } = {}): Promise<void> {
  return request('/api/auth/me', { method: 'DELETE', body: payload });
}

// #M5: cambio password per utente loggato. Richiede password attuale; il backend
// revoca il JWT corrente al successo, l'utente deve fare login di nuovo.
export function changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  return request('/api/auth/me/password', { method: 'POST', body: payload });
}
export function updateLocation(lat: number, lng: number): Promise<{ lat: number; lng: number; address?: string | null }> {
  return request('/api/auth/me/location', { method: 'PUT', body: { lat, lng } });
}

// Push notifications — RF40. The frontend gets an FCM token from Firebase
// and registers it here so the backend can target this device.
export function registerDeviceToken(token: string, platform: 'web' | 'ios' | 'android' = 'web'): Promise<{ id: string }> {
  return request('/api/notifications/device-token', { method: 'POST', body: { token, platform } });
}
export function unregisterDeviceToken(token: string): Promise<void> {
  return request('/api/notifications/device-token', { method: 'DELETE', body: { token } });
}
export function sendTestPush(): Promise<{ tokensTargeted: number }> {
  return request('/api/notifications/test', { method: 'POST' });
}

// 2FA — RNF15. Two-step setup: client calls setup2fa() to get the otpauth URL +
// secret, displays a QR code, then calls verify2fa() with the 6-digit code.
export function setup2fa(): Promise<Setup2FAResponse> {
  return request('/api/auth/2fa/setup', { method: 'POST' });
}
export async function verify2fa(token: string): Promise<Verify2FAResponse> {
  const result = await request<Verify2FAResponse>('/api/auth/2fa/verify', { method: 'POST', body: { token } });
  if (result.token) setToken(result.token);
  return result;
}
export function regenerateRecoveryCodes(): Promise<RecoveryCodesResponse> {
  return request('/api/auth/2fa/recovery-codes', { method: 'POST' });
}
export function verifyEmail(token: string): Promise<AuthResponse> {
  return request(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { auth: false });
}

// ============================== Activities (write) ==============================

export interface CreateActivityPayload {
  tipo: string; data: string; orarioInizio: string; orarioFine: string;
  maxPartecipanti: number; latitudine?: number; longitudine?: number; poiId?: string;
}
export function createActivity(payload: CreateActivityPayload): Promise<ApiActivity> {
  return request('/api/activities', { method: 'POST', body: payload });
}
export function joinActivity(activityId: string): Promise<ApiActivity> {
  return request(`/api/activities/${encodeURIComponent(activityId)}/join`, { method: 'POST' });
}
export function leaveActivity(activityId: string): Promise<void> {
  return request(`/api/activities/${encodeURIComponent(activityId)}/join`, { method: 'DELETE' });
}
export function cancelActivity(activityId: string): Promise<void> {
  return request(`/api/activities/${encodeURIComponent(activityId)}`, { method: 'DELETE' });
}

// ============================== Events (write) ==============================

export interface CreateEventPayload {
  titolo: string; descrizione?: string; categoria: string;
  data?: string; orarioInizio?: string; orarioFine?: string;
  latitudine?: number; longitudine?: number; poiId?: string;
  maxPartecipanti?: number;
}
export function createEvent(payload: CreateEventPayload): Promise<ApiEvent> {
  return request('/api/events', { method: 'POST', body: payload });
}
export function getMyEvents(): Promise<{ events: ApiEvent[] }> {
  return request('/api/events/mine');
}
export function getEventStats(eventId: string): Promise<{ eventId: string; titolo: string; views: number; reports: number }> {
  return request(`/api/events/${encodeURIComponent(eventId)}/stats`);
}
export function deleteEvent(eventId: string): Promise<void> {
  return request(`/api/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}

// ============================== Dashboard (municipal admin) ==============================

export function getDashboardStats(params?: DashboardFilters | Record<string, string | number>): Promise<DashboardStats & { filters?: unknown }> {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}` : '';
  return request(`/api/dashboard/stats${qs}`);
}
export function getDashboardExportUrl(format: 'csv' | 'pdf', params?: Record<string, string | number>): string {
  const allParams = { ...(params || {}), format };
  const qs = new URLSearchParams(Object.entries(allParams).map(([k, v]) => [k, String(v)])).toString();
  return `${API_BASE_URL}/api/dashboard/stats/export?${qs}`;
}
export interface DashboardFilters {
  tipo?: string;
  da?: string;
  a?: string;
  centerLat?: string | number;
  centerLng?: string | number;
  radiusKm?: string | number;
  poiId?: string;
}
export function getDashboardServiceRequests(
  params?: Pick<DashboardFilters, 'centerLat' | 'centerLng' | 'radiusKm'>,
): Promise<ServiceRequestStats> {
  const qs = params
    ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()}`
    : '';
  return request(`/api/dashboard/service-requests${qs}`);
}

export function submitServiceRequest(payload: {
  categoria: ServiceRequestCategory;
  latitudine: number;
  longitudine: number;
}): Promise<{ id: string; categoria: string; createdAt: string }> {
  return request('/api/service-requests', { method: 'POST', body: payload });
}

export async function downloadDashboardExport(format: 'csv' | 'pdf', params?: DashboardFilters & { dataset?: string }): Promise<Blob> {
  const allParams: Record<string, string> = { format };
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') allParams[k] = String(v);
    }
  }
  const qs = new URLSearchParams(allParams).toString();
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}/api/dashboard/stats/export?${qs}`, { headers });
  if (!res.ok) throw new Error(`Export fallito (${res.status})`);
  return res.blob();
}

// ============================== Admin ==============================

export interface PendingEntity {
  id: string; email: string; nome: string; nomeEnte: string; createdAt: string;
}
export function getPendingEntities(): Promise<PendingEntity[]> {
  return request('/api/admin/entities/pending');
}
export function approveEntity(id: string): Promise<{ message: string }> {
  return request(`/api/admin/entities/${encodeURIComponent(id)}/approve`, { method: 'PATCH' });
}
export function rejectEntity(id: string): Promise<{ message: string }> {
  return request(`/api/admin/entities/${encodeURIComponent(id)}/reject`, { method: 'PATCH' });
}

export interface AdminUser {
  id: string; email: string; nome: string; cognome: string;
  ruolo: string; approvato?: boolean; nomeEnte?: string | null; createdAt: string;
}
export function getAdminUsers(): Promise<AdminUser[]> {
  return request('/api/admin/users');
}
export function deleteAdminUser(id: string): Promise<void> {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// === Admin users — split per ruolo (tabelle profilo separate) ===
export interface AdminCittadino {
  id: string; email: string; createdAt: string; emailVerified: boolean;
  nome?: string; cognome?: string; dataNascita?: string;
  codiceFiscale?: string; interessi?: string[];
}
export interface AdminEnte {
  id: string; email: string; createdAt: string; emailVerified: boolean;
  nomeEnte?: string; pec?: string; approvato?: boolean; noteAdmin?: string;
}
export interface AdminComunale {
  id: string; email: string; createdAt: string;
  nome?: string; cognome?: string; ufficio?: string; spidId?: string;
}
export interface AdminSistema {
  id: string; email: string; createdAt: string; twoFactorEnabled: boolean;
  nome?: string; cognome?: string; superAdmin?: boolean;
}
export function getAdminCittadini(): Promise<AdminCittadino[]> {
  return request('/api/admin/users/cittadini');
}
export function getAdminEnti(): Promise<AdminEnte[]> {
  return request('/api/admin/users/enti');
}
export function getAdminComunali(): Promise<AdminComunale[]> {
  return request('/api/admin/users/comunali');
}
export function getAdminSistema(): Promise<AdminSistema[]> {
  return request('/api/admin/users/sistema');
}

export interface POI {
  id: string; nome: string; latitudine: number; longitudine: number;
  capacitaMax: number; statoAffollamento: string; tipo?: string; descrizione?: string;
  indirizzo?: string | null;
}
export function getPOIs(): Promise<POI[]> {
  return request('/api/map/poi', { auth: false });
}
export function createPOI(payload: Partial<POI>): Promise<POI> {
  return request('/api/map/poi', { method: 'POST', body: payload });
}
export function updatePOI(id: string, payload: Partial<POI>): Promise<POI> {
  return request(`/api/map/poi/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
}
export function deletePOI(id: string): Promise<void> {
  return request(`/api/map/poi/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ============================== Moderation ==============================

export interface Report {
  id: string; userId: string; eventId: string;
  tipo: string; stato: string; descrizione?: string; createdAt: string;
  event?: { id: string; titolo: string };
}
export function reportEvent(eventId: string, tipo: string, descrizione?: string): Promise<Report> {
  return request(`/api/moderation/events/${encodeURIComponent(eventId)}/report`, { method: 'POST', body: { tipo, descrizione } });
}
export function getReports(stato?: string): Promise<{ reports: Report[] }> {
  const qs = stato ? `?stato=${encodeURIComponent(stato)}` : '';
  return request(`/api/moderation/reports${qs}`);
}
export function resolveReport(id: string, azione: 'rimuovi' | 'archivia' | 'in_lavorazione'): Promise<{ message: string }> {
  return request(`/api/moderation/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: { azione } });
}

// ============================== Calendar ICS ==============================

export function getActivityCalendarUrl(id: string): string {
  return `${API_BASE_URL}/api/activities/${encodeURIComponent(id)}/calendar`;
}
export function getEventCalendarUrl(id: string): string {
  return `${API_BASE_URL}/api/events/${encodeURIComponent(id)}/calendar`;
}

function toGoogleDate(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
export function googleCalendarUrl(title: string, startIso: string, location?: string | null): string {
  const start = toGoogleDate(startIso);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${start}`, location: location || '' });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ============================== Parking (proxy Comune di Trento) ==============================

export type CrowdingLevel = 'verde' | 'giallo' | 'rosso';
export interface ParkingSpot {
  id: string;
  name: string;
  type: 'car' | 'bike';
  capacity: number;
  free: number | null;
  occupied: number | null;
  occupancyPct: number | null;
  status: CrowdingLevel;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  description: string | null;
  link: string | null;
  updatedAt: string | null;
}
export interface ParkingResponse { parkings: ParkingSpot[]; fetchedAt: string; }
// Public — the backend proxies the Comune di Trento registry (avoids CORS).
export function getParking(): Promise<ParkingResponse> {
  return request('/api/parking', { auth: false });
}

// ============================== Admin: push notifications ==============================

export type PushAudience = 'all' | 'cittadini' | 'enti' | 'comunali';
export interface PushStats {
  totalTokens: number;
  usersReachable: number;
  byPlatform: Record<string, number>;
}
export function getPushStats(): Promise<PushStats> {
  return request('/api/notifications/admin/stats');
}
export function sendAdminBroadcast(payload: { title: string; body: string; audience: PushAudience }): Promise<{ tokensTargeted: number; audience: PushAudience }> {
  return request('/api/notifications/admin/broadcast', { method: 'POST', body: payload });
}
