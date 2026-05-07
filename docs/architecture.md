# Architecture — Trento Live Activity

> Source: Deliverable D2 (Group 7 — Marcatili, Soussane, Safi)

---

## Overview

Trento Live Activity adopts a **microservices architecture** with a central API Gateway that routes all incoming requests to specialised internal components. The design goal is to minimise coupling between components while maximising internal cohesion. All client-to-backend communication flows exclusively through the API Gateway; no component is directly reachable from the frontend.

```
Browser / Mobile
       │
       ▼
 Frontend WebApp
       │  REST
       ▼
  API Gateway  ──────────────────────────────────┐
       │                                          │
       ├──► Gestione Autenticazione               │
       │         │ OAuth (Google/Apple)            │
       │         │ SPID (Amministratori Comunali)  │
       │                                          │
       ├──► Gestione Attività ed Eventi            │
       │                                          │
       ├──► Gestione Mappa e POI                  │
       │         │ REST / MQTT ◄── Sensori IoT    │
       │         │ Maps API (Google / OSM)         │
       │                                          │
       ├──► Dashboard Analitica                   │
       │                                          │
       ├──► Moderazione Contenuti                 │
       │                                          │
       ├──► Gestione Notifiche                    │
       │         │ Firebase Cloud Messaging        │
       │         │ SMTP                            │
       │                                          │
       └──► Gestione Dati ──────────────────► PostgreSQL
```

---

## Components

### 1. Frontend WebApp
Presentation layer accessible via browser or mobile. Renders the interactive map, authentication screens, activity/event lists, and the admin dashboard. All requests are forwarded to the API Gateway — the frontend never communicates directly with internal services.

| Interface | Name | Description |
|-----------|------|-------------|
| Required | Routing | Sends all UI-generated requests to the API Gateway |
| Required | Map Service | Uses external cartographic APIs (Google Maps / OpenStreetMap) for in-browser map rendering |

### 2. API Gateway
Single entry point for all frontend requests. Handles JWT validation, RBAC enforcement, and rate limiting.

| Interface | Name | Description |
|-----------|------|-------------|
| Provided | Routing | Exposes a unified REST interface to the frontend |
| Required | Auth & Token Verification | Delegates JWT verification to the Auth component |
| Required | Activity & Event Management | Routes activity/event lifecycle requests |
| Required | Map Management | Routes map and POI requests |
| Required | Reports & Statistics | Routes dashboard requests from municipal admins |

### 3. Gestione Autenticazione
Handles login, registration, password recovery, OAuth (Google/Apple), SPID (municipal admins), and 2FA (system admins). Implements RBAC as per RNF15.

| Interface | Name | Description |
|-----------|------|-------------|
| Provided | Authentication | login, logout, register, password recovery |
| Provided | Token Verification | JWT validation + RBAC role extraction |
| Required | OAuth Provider | Google / Apple OAuth 2.0 |
| Required | SPID Provider | SPID identity federation |
| Required | Notification Sending | Transactional emails via Gestione Notifiche |
| Required | Data Access | Credential persistence via Gestione Dati |

### 4. Gestione Attività ed Eventi
Manages the full lifecycle of spontaneous user activities and certified entity events. Covers RF10, RF11, RF17, RF19, RF21, RF24.

| Interface | Name | Description |
|-----------|------|-------------|
| Provided | Activity Management | CRUD for spontaneous activities |
| Provided | Event Management | CRUD for certified events |
| Required | Notification Sending | Proximity alerts, participation confirmations |
| Required | Content Moderation | Report handling for certified events |
| Required | Data Access | Persistence via Gestione Dati |

### 5. Gestione Mappa e POI
Manages points of interest, aggregates real-time IoT data (parking, crowding), and personalises map layers per user profile. Covers RF2, RF3, RF9, RF36, RF38, RF39.

| Interface | Name | Description |
|-----------|------|-------------|
| Provided | Map Management | CRUD for POIs |
| Required | Map Service | Google Maps / OpenStreetMap (geocoding, server-side rendering) |
| Required | IoT Sensors | Real-time data via REST or MQTT |
| Required | Data Access | POI persistence and historical usage data |

### 6. Gestione Notifiche
Sends push notifications and transactional emails. Uses Firebase Cloud Messaging for push and an SMTP service for email. Covers RF40, RF45.

| Interface | Name | Description |
|-----------|------|-------------|
| Provided | Notification Sending | Unified interface for push + email |
| Required | Push Provider | Firebase Cloud Messaging |
| Required | SMTP Service | External SMTP for transactional emails |
| Required | Data Access | User notification preferences and device tokens |

### 7. Moderazione Contenuti
Manages the report/moderation flow in compliance with the Digital Services Act (EU Reg. 2022/2065). Covers RF16, RF33, RNF23, RNF24.

| Interface | Name | Description |
|-----------|------|-------------|
| Provided | Moderation | Report review and resolution (remove / archive) by system admins |
| Required | Notification Sending | Alerts to admins on new reports; notice to entities on removal |
| Required | Data Access | Report persistence and audit trail |

### 8. Dashboard Analitica
Provides municipal admins with aggregated usage statistics: infrastructure crowding, event participation, temporal trends, geographic distributions. Supports PDF/CSV export. Covers RF27–RF30.

| Interface | Name | Description |
|-----------|------|-------------|
| Provided | Statistics | Filterable aggregate stats (type, zone, period) |
| Provided | Reports | PDF/CSV export |
| Required | Data Access | Aggregated query results via Gestione Dati |

### 9. Gestione Dati
Uniform data access layer over PostgreSQL (RNF35). Abstracts the persistence layer from all other components. Guarantees referential integrity and logical separation between personal and public data.

| Interface | Name | Description |
|-----------|------|-------------|
| Provided | Data Access | Unified CRUD interface (users, activities, events, POIs, reports, notifications) |
| Required | Database | PostgreSQL DBMS |

---

## Domain Model (Class Summary)

### Support Classes
- **Data** — day/month/year; `inizializzaDataCorrente()`, `confronta(d)`
- **Orario** — hour/minute; `aggiungiMinuti(m)`, `confronta(o)`
- **Coordinate** — latitude/longitude; `calcolaDistanza(c)` (Haversine)

### Authentication & Profile
- **GestioneAutenticazione** — login, register, OAuth, SPID, 2FA
- **Utente** — user profile with role (`UtenteRegistrato | AmministratoreComunale | AmministratoreDiSistema`), interests, logout, delete-account (GDPR art. 17)
- **EnteCertificato** — extends Utente; certified organisations that can publish events
- **ValidatoreCredenziali** — utility; validates password strength and email format (RFC 5322)

### Activity & Event Management
- **Attività** — spontaneous user-created activity (structured fields, 2–50 participants)
- **Evento** — certified entity event (free-text fields, DSA-compliant reporting, verification badge)
- **Partecipazione** — join table resolving Utente ↔ Attività many-to-many
- **ListaAttività** — aggregates activities and events; supports filtering by category, user interests, and ordering

### Map & POI
- **PuntoInteresse** — map location with real-time crowding status (`verde | giallo | rosso`)
- **Mappa** — interactive city map; personalises layers per user profile

### Moderation
- **Segnalazione** — report of inappropriate content; states: `aperta | in lavorazione | risolta`

### Notifications & Dashboard
- **GestoreNotifiche** — push (FCM) and email (SMTP) dispatch
- **DashboardAnalitica** — statistics loading, filter application, PDF/CSV export

### Data Layer
- **GestoreDB** — uniform PostgreSQL access layer

---

## External Services

| Service | Used By | Protocol |
|---------|---------|----------|
| Google Maps / OpenStreetMap | Frontend WebApp, Gestione Mappa e POI | REST API |
| OAuth Provider (Google, Apple) | Gestione Autenticazione | OAuth 2.0 |
| SPID Provider | Gestione Autenticazione | SPID / SAML2 |
| Firebase Cloud Messaging | Gestione Notifiche | FCM REST API |
| SMTP Service | Gestione Notifiche | SMTP |
| IoT Sensors | Gestione Mappa e POI | REST / MQTT |

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architectural style | Microservices + API Gateway | Minimise coupling; enable independent component scaling |
| Database | PostgreSQL (RNF35) | Relational integrity for structured data; separation of personal vs public data |
| Authentication | JWT + RBAC | Stateless token validation across services |
| Municipal admin auth | SPID | Italian public digital identity standard |
| System admin auth | Internal credentials + mandatory 2FA (RNF15) | Elevated security for privileged access |
| Real-time data | REST or MQTT from IoT sensors | IoT compatibility; low-latency crowding updates |
| Push notifications | Firebase Cloud Messaging | Cross-platform (Android/iOS/web) |
| Maps | Google Maps or OpenStreetMap | Flexible; OSM as open/free fallback |
| Content moderation | DSA-compliant flow (EU Reg. 2022/2065) | Legal obligation; RNF23, RNF24 |