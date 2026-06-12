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
  superAdmin?: boolean;
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
  totalUsers?: never;
  totalActivities: number;
  totalEvents: number;
  totalPOIs: number;
  totalParticipations: number;
  activitiesByType: Array<{ tipo: string; count: number }>;
  eventsByCategory?: Array<{ categoria: string; count: number }>;
  poiCrowding: Array<{ statoAffollamento: string; count: number }>;
  topCrowdedPOIs?: Array<{ id: string; nome: string; tipo: string | null; statoAffollamento: string; capacitaMax: number }>;
  poiByType?: Array<{ tipo: string | null; count: number }>;
  activitiesByDay?: Array<{ date: string; count: number }>;
  activitiesByHour?: Array<{ hour: string; count: number }>;
}

export type ServiceRequestCategory =
  | 'parcheggio_auto' | 'parcheggio_bici' | 'sport' | 'studio'
  | 'verde' | 'cultura' | 'ciclismo' | 'altro';

export type ServiceRequestSubcategory =
  | 'coperto' | 'scoperto' | 'disabili' | 'carica_ev'
  | 'rastrelliera' | 'box_bici'
  | 'ping_pong' | 'basket' | 'calcetto' | 'pallavolo' | 'atletica' | 'yoga' | 'altro_sport'
  | 'biblioteca' | 'coworking' | 'sala_studio'
  | 'teatro' | 'cinema' | 'museo' | 'sala_prove'
  | 'pista_ciclabile' | 'pump_track';

export const SUBCATEGORIES_BY_CATEGORY: Record<ServiceRequestCategory, ServiceRequestSubcategory[]> = {
  parcheggio_auto: ['coperto', 'scoperto', 'disabili', 'carica_ev'],
  parcheggio_bici: ['rastrelliera', 'box_bici'],
  sport:           ['ping_pong', 'basket', 'calcetto', 'pallavolo', 'atletica', 'yoga', 'altro_sport'],
  studio:          ['biblioteca', 'coworking', 'sala_studio'],
  verde:           [],
  cultura:         ['teatro', 'cinema', 'museo', 'sala_prove'],
  ciclismo:        ['pista_ciclabile', 'pump_track'],
  altro:           [],
};

export interface ServiceRequestStats {
  byCategory: Array<{ categoria: string; count: number }>;
  bySubcategory?: Array<{ categoria: string; sottocategoria: string; count: number }>;
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

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
const TOKEN_KEY = 'tla_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
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

// Serializza solo i parametri valorizzati: URLSearchParams trasformerebbe
// undefined/null nelle stringhe letterali "undefined"/"null".
function toQuery(params?: object): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
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
  const payload = await request<EventsResponse | ApiEvent[]>(`/api/events${toQuery(params)}`);
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
  const payload = await request<ActivitiesResponse | ApiActivity[]>(`/api/activities${toQuery(params)}`);
  return arrayFromPayload<ApiActivity>(payload, 'activities');
}
export function getActivityById(id: string): Promise<ApiActivity> {
  return request<ApiActivity>(`/api/activities/${encodeURIComponent(id)}`);
}
export async function getMapMarkers(): Promise<MapMarker[]> {
  const payload = await request<MapResponse | MapMarker[]>('/api/map');
  return arrayFromPayload<MapMarker>(payload, 'markers');
}
export function getHomeMapData(): Promise<{
  markers: MapMarker[];
  pois: any[];
  activities: ApiActivity[];
  events: ApiEvent[];
}> {
  return request('/api/map');
}

// ============================== Comments ==============================

export interface ApiComment {
  id: string;
  eventId: string;
  userId: string;
  parentCommentId: string | null;
  text: string;
  createdAt: string;
  user?: { nome: string; cognome: string } | null;
  replies?: ApiComment[];
}

export async function getComments(eventId: string): Promise<ApiComment[]> {
  const payload = await request<{ comments: ApiComment[] } | ApiComment[]>(`/api/events/${encodeURIComponent(eventId)}/comments`);
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.comments)) return payload.comments;
  return [];
}

export function postComment(eventId: string, text: string, parentCommentId?: string | null): Promise<ApiComment> {
  return request(`/api/events/${encodeURIComponent(eventId)}/comments`, { method: 'POST', body: { text, parentCommentId } });
}

export function patchComment(commentId: string, text: string): Promise<{ message: string }> {
  return request(`/api/comments/${encodeURIComponent(commentId)}`, { method: 'PATCH', body: { text } });
}

export function deleteComment(commentId: string): Promise<void> {
  return request(`/api/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
}

// ============================== Reviews ==============================

export interface ApiReview {
  id: string;
  activityId: string;
  userId: string;
  ratingOverall: number;
  ratingAccuracy: number;
  ratingOrganization: number;
  ratingSafety: number;
  ratingAtmosphere: number;
  comment: string;
  createdAt: string;
  user?: { nome: string; cognome: string } | null;
}

export async function getActivityReviews(activityId: string): Promise<ApiReview[]> {
  const payload = await request<{ reviews: ApiReview[] } | ApiReview[]>(`/api/activities/${encodeURIComponent(activityId)}/reviews`);
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.reviews)) return payload.reviews;
  return [];
}

export function postActivityReview(activityId: string, payload: {
  ratingOverall: number;
  ratingAccuracy: number;
  ratingOrganization: number;
  ratingSafety: number;
  ratingAtmosphere: number;
  comment: string;
}): Promise<ApiReview> {
  return request(`/api/activities/${encodeURIComponent(activityId)}/reviews`, { method: 'POST', body: payload });
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
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
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
export function completeOnboarding(payload: { interessi: string[]; dataNascita?: string }): Promise<{ interessi: string[]; onboardingComplete: true }> {
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
export function deleteAccount(payload: { currentPassword?: string; confirmEmail?: string } = {}): Promise<void> {
  return request('/api/auth/me', { method: 'DELETE', body: payload });
}

export function changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  return request('/api/auth/me/password', { method: 'POST', body: payload });
}
export function updateLocation(lat: number, lng: number): Promise<{ lat: number; lng: number; address?: string | null }> {
  return request('/api/auth/me/location', { method: 'PUT', body: { lat, lng } });
}

// Push notifications
export function registerDeviceToken(token: string, platform: 'web' | 'ios' | 'android' = 'web'): Promise<{ id: string }> {
  return request('/api/notifications/device-token', { method: 'POST', body: { token, platform } });
}
export function unregisterDeviceToken(token: string): Promise<void> {
  return request('/api/notifications/device-token', { method: 'DELETE', body: { token } });
}
export function sendTestPush(): Promise<{ tokensTargeted: number }> {
  return request('/api/notifications/test', { method: 'POST' });
}

// 2FA
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
  return request(`/api/dashboard/stats${toQuery(params)}`);
}
export function getDashboardExportUrl(format: 'csv' | 'pdf', params?: Record<string, string | number>): string {
  const qs = toQuery({ ...(params || {}), format });
  return `${API_BASE_URL}/api/dashboard/stats/export${qs}`;
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
  sottocategoria?: ServiceRequestSubcategory | null;
  latitudine: number;
  longitudine: number;
}): Promise<{ id: string; categoria: string; sottocategoria: string | null; createdAt: string }> {
  return request('/api/service-requests', { method: 'POST', body: payload });
}

export async function downloadDashboardExport(format: 'csv' | 'pdf', params?: DashboardFilters & { dataset?: string; datasets?: string }): Promise<Blob> {
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
  if (!res.ok) {
    // Backend errors are JSON ({ error, code }) — surface the real message.
    let message = `Export fallito (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* non-JSON error body — keep generic message */ }
    throw new Error(message);
  }
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
  ruolo: string; ruoloLabel?: string; approvato?: boolean; nomeEnte?: string | null; createdAt: string;
}
export function getAdminUsers(): Promise<AdminUser[]> {
  return request('/api/admin/users');
}
export function deleteAdminUser(id: string): Promise<void> {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

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
export function createAdminComunale(payload: { nome: string; cognome: string; email: string; password: string; ufficio?: string }): Promise<AdminComunale> {
  return request('/api/admin/users/comunali', { method: 'POST', body: payload });
}
export function createAdminSistema(payload: { nome: string; cognome: string; email: string; password: string }): Promise<AdminSistema> {
  return request('/api/admin/users/sistema', { method: 'POST', body: payload });
}
export function toggleSuperAdmin(id: string, superAdmin: boolean): Promise<{ id: string; superAdmin: boolean }> {
  return request(`/api/admin/users/sistema/${encodeURIComponent(id)}/super-admin`, { method: 'PATCH', body: { superAdmin } });
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
export function geocodeForward(q: string): Promise<{ result: { lat: number; lng: number; formatted: string } | null }> {
  return request(`/api/map/geocode-forward?q=${encodeURIComponent(q)}`, { auth: false });
}
export function reverseGeocode(lat: number, lon: number): Promise<{ address: string | null }> {
  return request(`/api/map/geocode?lat=${lat}&lon=${lon}`, { auth: false });
}
export function deletePOI(id: string): Promise<void> {
  return request(`/api/map/poi/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ============================== Moderation ==============================

export interface Report {
  id: string; userId: string; eventId: string | null; activityId: string | null;
  tipo: string; stato: string; descrizione?: string; createdAt: string;
  event?: { id: string; titolo: string } | null;
  activity?: { id: string; title?: string | null; tipo?: string | null } | null;
}
export function reportEvent(eventId: string, tipo: string, descrizione?: string): Promise<Report> {
  return request(`/api/moderation/events/${encodeURIComponent(eventId)}/report`, { method: 'POST', body: { tipo, descrizione } });
}
export function reportActivity(activityId: string, tipo: string, descrizione?: string): Promise<Report> {
  return request(`/api/moderation/activities/${encodeURIComponent(activityId)}/report`, { method: 'POST', body: { tipo, descrizione } });
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

// ============================== Parking ==============================

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
export interface ParkingDetailItem {
  id: string;
  name: string;
  address: string | null;
  area?: string | null;
  latitude: number | null;
  longitude: number | null;
  availableSpaces: number | null;
  totalSpaces: number;
  occupancyPercentage: number | null;
  status: 'available' | 'almost_full' | 'full' | 'unknown';
  lastUpdatedAt: string | null;
  sourceLabel: string;
  type?: 'car' | 'bike';
  link?: string | null;
}
export interface ParkingResponse {
  city?: string;
  source?: { name: string; url: string; scrapedAt: string };
  items?: ParkingDetailItem[];
  parkings: ParkingSpot[];
  fetchedAt: string;
}
export function getParking(): Promise<ParkingResponse> {
  return request('/api/parking/trento', { auth: false });
}

// ============================== Weather and city alerts ==============================

export interface WeatherHour {
  time: string;
  temperature: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  condition: string;
  windSpeed: number | null;
}
export interface WeatherDay {
  date: string;
  weatherCode: number | null;
  condition: string;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbabilityMax: number | null;
  sunrise: string | null;
  sunset: string | null;
}
export interface WeatherResponse {
  city: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  source: { name: string; url: string; fetchedAt: string };
  current: {
    temperature: number | null;
    apparentTemperature: number | null;
    humidity: number | null;
    condition: string;
    weatherCode: number | null;
    cloudCover: number | null;
    precipitation: number | null;
    rain: number | null;
    showers: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    windGusts: number | null;
    isDay: boolean;
    time: string;
  };
  daily: WeatherDay[];
  hourly: WeatherHour[];
  unavailable?: boolean;
  stale?: boolean;
}
export function getTrentoWeather(): Promise<WeatherResponse> {
  return request('/api/weather/trento', { auth: false });
}

export type AlertSeverity = 'high' | 'medium' | 'low' | 'info';
export interface CityAlertSummary {
  id: string;
  title: string;
  summary: string;
  severity: AlertSeverity;
  category: string;
  sourceName: string;
  publishedAt: string;
  updatedAt: string;
  hasLocation: boolean;
}
export interface CityAlertDetail extends CityAlertSummary {
  description: string;
  source: { name: string; url: string };
  location: { label: string; latitude: number; longitude: number } | null;
}
export interface CityAlertsResponse {
  city: string;
  source: { name: string; url: string; scrapedAt: string };
  items: CityAlertSummary[];
}
export function getCityAlerts(): Promise<CityAlertsResponse> {
  return request('/api/city-alerts/trento', { auth: false });
}
export function getCityAlertById(id: string): Promise<CityAlertDetail> {
  return request(`/api/city-alerts/${encodeURIComponent(id)}`, { auth: false });
}

// ============================== Admin notifications ==============================

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

// ============================== Settings ==============================
export interface UserSettings {
  themeMode: string;
  visualEffects: string;
  language: string;
  timeFormat: string;
  distanceUnit: string;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  eventNotificationsEnabled: boolean;
  activityNotificationsEnabled: boolean;
  cityAlertNotificationsEnabled: boolean;
  locationMode: string;
  participationVisibility: string;
  showProfileInParticipants: boolean;
  interestsJson: string[];
  showOnlyReliableActivities: boolean;
  showVerifiedActivities: boolean;
  reduceAnimations: boolean;
  increaseContrast: boolean;
  largerText: boolean;
}

function normalizeSettings(payload: any): UserSettings {
  if (payload?.appearance || payload?.languageFormat || payload?.notifications) {
    return {
      themeMode: payload.appearance?.themeMode ?? 'light',
      visualEffects: payload.appearance?.visualEffects ?? 'full',
      language: payload.languageFormat?.language ?? 'it',
      timeFormat: payload.languageFormat?.timeFormat ?? '24h',
      distanceUnit: payload.languageFormat?.distanceUnit ?? 'km',
      emailNotificationsEnabled: !!payload.notifications?.emailEnabled,
      pushNotificationsEnabled: !!payload.notifications?.pushEnabled,
      eventNotificationsEnabled: !!payload.notifications?.eventNotifications,
      activityNotificationsEnabled: !!payload.notifications?.activityNotifications,
      cityAlertNotificationsEnabled: !!payload.notifications?.cityAlertNotifications,
      locationMode: payload.privacyLocation?.locationMode ?? 'while_using',
      participationVisibility: payload.privacyLocation?.participationVisibility ?? 'public',
      showProfileInParticipants: payload.privacyLocation?.showProfileInParticipants ?? true,
      interestsJson: payload.preferences?.interests ?? [],
      showOnlyReliableActivities: !!payload.preferences?.showOnlyReliableActivities,
      showVerifiedActivities: !!payload.preferences?.showVerifiedActivities,
      reduceAnimations: !!payload.accessibility?.reduceAnimations,
      increaseContrast: !!payload.accessibility?.increaseContrast,
      largerText: !!payload.accessibility?.largerText,
    };
  }
  return payload as UserSettings;
}

export async function getSettings(): Promise<UserSettings> {
  return normalizeSettings(await request('/api/me/settings'));
}

export function updateAppearance(data: { themeMode?: string; visualEffects?: string }) {
  return request<UserSettings>('/api/me/settings/appearance', { method: 'PATCH', body: data });
}

export function updateLanguageFormat(data: { language?: string; timeFormat?: string; distanceUnit?: string }) {
  return request<UserSettings>('/api/me/settings/language-format', { method: 'PATCH', body: data });
}

export function updateNotifications(data: Partial<Pick<UserSettings, 'emailNotificationsEnabled' | 'pushNotificationsEnabled' | 'eventNotificationsEnabled' | 'activityNotificationsEnabled' | 'cityAlertNotificationsEnabled'>>) {
  return request('/api/me/settings/notifications', {
    method: 'PATCH',
    body: {
      emailEnabled: data.emailNotificationsEnabled,
      pushEnabled: data.pushNotificationsEnabled,
      eventNotifications: data.eventNotificationsEnabled,
      activityNotifications: data.activityNotificationsEnabled,
      cityAlertNotifications: data.cityAlertNotificationsEnabled,
    },
  });
}

export function updatePrivacyLocation(data: { locationMode?: string; participationVisibility?: string; showProfileInParticipants?: boolean }) {
  return request<UserSettings>('/api/me/settings/privacy-location', { method: 'PATCH', body: data });
}

export function updatePreferences(data: { interestsJson?: string[]; showOnlyReliableActivities?: boolean; showVerifiedActivities?: boolean }) {
  return request('/api/me/settings/preferences', {
    method: 'PATCH',
    body: {
      interests: data.interestsJson,
      showOnlyReliableActivities: data.showOnlyReliableActivities,
      showVerifiedActivities: data.showVerifiedActivities,
    },
  });
}

export function updateAccessibility(data: { reduceAnimations?: boolean; increaseContrast?: boolean; largerText?: boolean }) {
  return request<UserSettings>('/api/me/settings/accessibility', { method: 'PATCH', body: data });
}

export interface UserParticipation {
  id: string;
  userId: string;
  targetType: 'EVENT' | 'ACTIVITY';
  targetId: string;
  createdAt: string;
  target?: {
    id: string;
    title?: string;
    titolo?: string;
    category?: string;
    categoria?: string;
    location?: string;
    dateTime?: string;
    data?: string;
    orarioInizio?: string;
  } | null;
}

export function getMyParticipations(): Promise<UserParticipation[]> {
  return request<UserParticipation[]>('/api/users/me/participations');
}

export interface MeProfileSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  email: string;
  role: string;
}
export function getMeProfile(): Promise<MeProfileSummary> {
  return request('/api/me/profile');
}

export interface MyActivitySummary {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled' | 'under_review';
  participantsCount: number;
  capacity: number | null;
  averageRating: number;
  reviewCount: number;
  verifiedActivity: boolean;
  lastUpdatedAt: string;
}
export interface MyActivitiesResponse {
  items: MyActivitySummary[];
  pagination: { page: number; limit: number; total: number };
}
export function getMyActivities(params?: { status?: string; page?: number; limit?: number }): Promise<MyActivitiesResponse> {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()}` : '';
  return request(`/api/me/activities${qs}`);
}
