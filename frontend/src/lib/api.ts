export type CrowdingStatus = 'green' | 'yellow' | 'red';
export type MarkerType = 'poi' | 'activity' | 'event';
export type UserRole = 'anonymous' | 'registered_user' | 'municipal_admin' | 'system_admin';

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
}

interface EventsResponse {
  events: ApiEvent[];
}

interface ActivitiesResponse {
  activities: ApiActivity[];
}

interface MapResponse {
  markers: MapMarker[];
}

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

async function request<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ApiError('API non disponibile. Verifica che il backend sia avviato.');
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) {
      throw new ApiError('Risposta API non valida.', response.status);
    }
  }

  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    throw new ApiError(
      typeof body.error === 'string' ? body.error : 'Errore durante la richiesta API.',
      response.status,
      typeof body.code === 'string' ? body.code : undefined,
    );
  }

  return payload as T;
}

function arrayFromPayload<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }
  throw new ApiError(`Risposta API malformata: campo "${key}" mancante.`);
}

export async function getEvents(): Promise<ApiEvent[]> {
  const payload = await request<EventsResponse | ApiEvent[]>('/api/events');
  return arrayFromPayload<ApiEvent>(payload, 'events');
}

export function getEventById(id: string): Promise<ApiEvent> {
  return request<ApiEvent>(`/api/events/${encodeURIComponent(id)}`);
}

export async function getActivities(): Promise<ApiActivity[]> {
  const payload = await request<ActivitiesResponse | ApiActivity[]>('/api/activities');
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
