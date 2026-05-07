# CLAUDE.md — Trento Live Activity

This file provides context for Claude (and any AI assistant) working on this codebase.

---

## Project Summary

**Trento Live Activity** is a civic-tech web platform for the city of Trento. Citizens can explore real-time urban data (parking, crowding, events) on an interactive map and create/join spontaneous social activities. The Comune di Trento gets an admin analytics dashboard.

- **Course:** Software Engineering — University of Trento, a.a. 2025-2026
- **Professor:** Prof. Sandro Fiore (DISI)
- **Group 7:** Anas Soussane (243731), Filippo Marcatili (243199), Saif Safi (245473)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Backend** | Node.js + Express.js | Core of the project; all features exposed as REST APIs |
| **Database** | PostgreSQL | Required by RNF35; use an ORM (e.g. Sequelize, Prisma, or raw `pg`) |
| **Authentication** | JWT + RBAC | Stateless; roles: `UtenteRegistrato`, `AmministratoreComunale`, `AmministratoreDiSistema` |
| **OAuth** | Google, Apple | For registered users and certified entities |
| **SPID** | Italian public identity | For municipal administrators only |
| **2FA** | OTP (e.g. TOTP via speakeasy) | Mandatory for system administrators (RNF15) |
| **Push notifications** | Firebase Cloud Messaging | Cross-platform push |
| **Email** | SMTP (e.g. Nodemailer) | Transactional emails |
| **Maps** | Google Maps API / OpenStreetMap | Server-side geocoding in Map service; client-side rendering in frontend |
| **IoT data** | REST or MQTT | Consumed by the Map & POI service |
| **API docs** | OpenAPI 3 / Apiary | All endpoints must be documented |
| **Frontend** | HTML/CSS/JS (or React) | UI is a demonstrator; backend is primary focus |

---

## Architecture

Microservices with a central API Gateway. Never call internal services directly from the frontend.

```
Frontend
   │ REST
   ▼
API Gateway
   ├── /auth         → Auth Service
   ├── /activities   → Activity & Event Service
   ├── /map          → Map & POI Service
   ├── /notify       → Notification Service
   ├── /moderation   → Moderation Service
   └── /dashboard    → Analytics Dashboard
                           └──► PostgreSQL (via Data Layer)
```

Full details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Domain Model — Key Entities

```
Utente (role: UtenteRegistrato | AmministratoreComunale | AmministratoreDiSistema)
EnteCertificato extends Utente (approvato: Boolean)
Attività (tipo, data, orarioInizio, orarioFine, maxPartecipanti 2–50, stato)
Evento (titolo ≤100 chars, descrizione, categoria, badgeVerifica)
Partecipazione (join table: Utente ↔ Attività)
PuntoInteresse (coordinate, capacitaMax, statoAffollamento: verde|giallo|rosso)
Mappa (aggregates POIs)
Segnalazione (stato: aperta|in lavorazione|risolta)
GestoreNotifiche (FCM push + SMTP email)
DashboardAnalitica (stats + PDF/CSV export)
GestoreDB (uniform PostgreSQL access layer)
```

Full class descriptions and OCL constraints: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)

---

## Critical Business Rules

These are hard constraints from the deliverables — do not break them:

1. **Spontaneous activities use only predefined field values** (no free text) — this limits DSA applicability (RNF22).
2. **Certified events** allow free text and carry a **verification badge** — they are subject to DSA content reporting.
3. **maxPartecipanti** for activities: 2 ≤ n ≤ 50 (OCL C8).
4. **Activity start date** must not be in the past (OCL C9).
5. **Event title**: non-empty, ≤ 100 characters (OCL C17).
6. **SPID authentication** is for `AmministratoreComunale` only (OCL C4).
7. **2FA** is mandatory for `AmministratoreDiSistema` (RNF15).
8. **Minimum age 13** for registration (GDPR art. 8 / OCL C5).
9. **Right to erasure** must be implementable on account deletion (GDPR art. 17 / RF26).
10. **Content moderation flow** must comply with DSA (EU Reg. 2022/2065) — RNF23, RNF24.
11. A user can submit **only one report per event** (OCL C22).
12. `DashboardAnalitica` access requires `ruolo = AmministratoreComunale` (OCL C25).
13. Crowding status values are strictly `verde | giallo | rosso` (OCL C21).

---

## API Design Guidelines

- All endpoints documented in OpenAPI 3 (link on Apiary — add to README when available)
- RESTful: use nouns for resources, HTTP verbs for actions
- JWT in `Authorization: Bearer <token>` header for all protected routes
- Consistent error responses: `{ "error": "message", "code": "ERROR_CODE" }`
- Rate limiting handled at the API Gateway level

### Role-based access summary

| Route prefix | Minimum role |
|-------------|-------------|
| `GET /map`, `GET /activities`, `GET /events` | Public (no auth) |
| `POST /activities`, `POST /participate` | `UtenteRegistrato` |
| `POST /events` | `EnteCertificato` (approvato = true) |
| `GET /dashboard`, `GET /stats` | `AmministratoreComunale` (via SPID) |
| `POST /poi`, `DELETE /users/:id`, `GET /reports` | `AmministratoreDiSistema` (via 2FA) |

---

## Project Constraints (from professor)

- **Backend is the primary deliverable** — the frontend is a demonstrator (can be minimal for full grade; advanced UI gives bonus)
- **All features must be exposed as REST APIs**
- **Document all APIs on Apiary** (link required in Milestone 3 report)
- Use a **branching strategy** (avoid master-only) — do not delete branches after merge (professors check them)
- **All team members must commit** to the repository
- The project does not need to implement every planned feature — focus on the most relevant ones consistently

---

## Repository Conventions

- Branch naming: `feature/<short-name>`, `fix/<short-name>`, `sprint1/<feature>`
- Commit messages: imperative mood, e.g. `Add JWT middleware`, `Fix participation count decrement`
- PRs require at least one review before merging to `main`
- Test cases required from Sprint 1 (see `docs/tests/`)

---

## Deliverable Timeline

| Deliverable | Deadline | Content |
|-------------|----------|---------|
| D1 | 27/03/2026 ✅ | Requirements, use cases, BPMN |
| Pitch | 01/04/2026 ✅ | Presentation to Comune di Trento |
| D2 | 24/04/2026 ✅ | Component diagram, class diagram, OCL constraints |
| D3 (Milestone 3) | 15/05/2026 🔄 | Sprint 1 report: GitHub repo, Apiary link, backlog, burndown, test cases, sprint review & retrospective |
| D4 | 07/06/2026 ⏳ | Sprint 2 report |

---

## File Map

```
docs/
  ARCHITECTURE.md   ← component descriptions, architecture diagram
  REQUIREMENTS.md   ← functional requirements, NFRs, OCL constraints
backend/
  src/
    auth/           ← GestioneAutenticazione, Utente, ValidatoreCredenziali
    activities/     ← Attività, Evento, Partecipazione, ListaAttività
    map/            ← Mappa, PuntoInteresse, Coordinate
    notifications/  ← GestoreNotifiche (FCM + SMTP)
    moderation/     ← Segnalazione
    dashboard/      ← DashboardAnalitica
    data/           ← GestoreDB (PostgreSQL access layer)
    gateway/        ← API Gateway (routing, JWT validation, rate limiting)
```