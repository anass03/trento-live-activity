<div align="center">

# 🏔️ Trento Live Activity

### Interactive platform for social life and urban infrastructure in the city of Trento.

*perché i programmi pubblici non valgono nulla se non sai come accedervi*

<br/>

![University of Trento](https://img.shields.io/badge/University%20of%20Trento-a.a.%202025%2F26-AC1E2D?style=for-the-badge)
![Software Engineering](https://img.shields.io/badge/Software%20Engineering-Group%207-1E40AF?style=for-the-badge)
![Build](https://img.shields.io/badge/build-passing-22C55E?style=for-the-badge)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-4169E1?logo=postgresql&logoColor=white)
![MapLibre](https://img.shields.io/badge/MapLibre-GL-396CB2?logo=maplibre&logoColor=white)

**Anas Soussane · Filippo Marcatili · Saif Safi**

</div>

---

## What It Is

**Trento Live Activity is the civic operating system for daily life in Trento** — a real-time, interactive map that brings the entire public life of the city into a single place. Parking availability, how crowded a square or library is right now, certified events, spontaneous activities created by other citizens: everything the city offers, surfaced the moment it matters and personalised to what each person actually cares about.

A city does not lack things to do. It lacks a way for its people to *find* them. Trento Live Activity is that missing layer — the bridge between everything Trento already offers and the citizens who would use it if only they knew it was there.

> **The civic principle behind it.** In 2025, New York City launched **"Summer in NYC"** under Mayor Zohran Mamdani: an interactive portal that lets residents discover thousands of free and low-cost public programs — sports leagues, classes, summer jobs, mental-health support — filtered by age, neighbourhood, interests and travel distance. The insight was simple and powerful: *a public program that nobody can find is a program that doesn't exist.* Offering services is only half the job; the other half is **access**.
>
> **Trento Live Activity applies that exact principle to Trento** — and Trento is the ideal place for it. A compact university city with thousands of students and newcomers each year, a dense fabric of sports clubs, cultural associations and public spaces, and a Comune that already invests heavily in community life. The opportunities exist; what's been missing is the discovery-and-access layer that turns them into something people genuinely live. That is what this platform delivers.

### Real use cases

- 🎓 **The newcomer who knows no one.** A first-year student opens the map, sets her interests, and instantly sees the free concerts, study groups, language exchanges and sports leagues happening around her this week — filtered by distance and what she likes. *The Mamdani principle, made local.*
- 🅿️ **The citizen heading downtown.** Before leaving, he checks live parking availability and the green/yellow/red crowding status of the piazza, and chooses his moment — no circling, no wasted trips.
- ⚽ **The spontaneous organiser.** Someone wants a five-a-side match tomorrow evening. In a few taps she creates the activity; nearby users with matching interests are notified, join in, and add it to their calendar.
- 🏛️ **The certified entity.** A sports club or cultural institution publishes a verified event with a trust badge, reaches the right audience, and sees real engagement statistics for it.
- 🔔 **The personalised pulse.** Every user receives push and email notifications for activities near them that match their declared interests — the city comes to them, not the other way around.
- 📊 **The Comune di Trento.** Administrators get a dedicated analytics dashboard to monitor urban-activity trends, filter by area and time, and export statistical reports in PDF or CSV — turning citizen engagement into evidence for better public decisions.

Built to real standards from day one: **GDPR**-compliant data handling, a **DSA**-compliant moderation flow, **WCAG 2.1 AA** accessibility, SPID and 2FA authentication, and a bilingual (🇮🇹 / 🇬🇧) interface.

---

## Key Features

Everything the city offers, in one place — tailored to who you are.

| Feature | Who |
|---------|-----|
| Interactive map with real-time IoT data (parking, crowding) | All users |
| Filter and search activities, events, and POIs | All users |
| Create and join spontaneous activities | Registered users |
| Receive push/email notifications for nearby activities | Registered users |
| Publish certified events with verification badge | Certified entities |
| Report inappropriate content (DSA-compliant) | Registered users |
| Analytics dashboard with PDF/CSV export | Municipal administrator |
| Manage users, POIs, and content moderation | System administrator |

---

## Architecture

The backend follows a **microservices pattern** with a central REST API Gateway. The frontend communicates exclusively with the gateway; internal services are not directly exposed.

```
Frontend WebApp
      │ REST
      ▼
 API Gateway
      ├── Auth Service          (OAuth, SPID, 2FA, JWT/RBAC)
      ├── Activity & Event Svc  (CRUD, participation, notifications)
      ├── Map & POI Svc         (real-time IoT, geocoding)
      ├── Notification Svc      (FCM push, SMTP email)
      ├── Moderation Svc        (DSA-compliant report flow)
      ├── Analytics Dashboard   (stats, PDF/CSV export)
      └── Data Layer            ──► PostgreSQL
```

See [`docs/architecture.md`](docs/architecture.md) for the full component breakdown.
See [`docs/frontend-backend-db-connection.md`](docs/frontend-backend-db-connection.md) for the current frontend → backend API → PostgreSQL development flow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Internationalization | i18next (Italian / English) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Authentication | JWT · OAuth 2.0 (Google, Apple) · SPID · 2FA/OTP |
| Push notifications | Firebase Cloud Messaging |
| Email | SMTP (transactional) |
| Maps | MapLibre GL / OpenStreetMap |
| Real-time data | Server-Sent Events (SSE) · IoT sensors |
| API documentation | OpenAPI 3 (Swagger) |
| Version control | Git + GitHub |

---

## Repository Structure

```
trento-live-activity/
├── backend/              # Express.js API services
│   ├── src/
│   │   ├── auth/         # Authentication & JWT
│   │   ├── activities/   # Activity & event management
│   │   ├── map/          # Map & POI service
│   │   ├── notifications/# Push & email notifications
│   │   ├── moderation/   # Report management
│   │   └── dashboard/    # Analytics dashboard
│   └── package.json
├── frontend/             # React + TypeScript web client
├── docs/
│   ├── architecture.md   # Component diagram & descriptions
│   ├── requirements.md   # Functional & non-functional requirements
│   └── openapi.yaml      # OpenAPI 3 specification
└── README.md
```

---

## API Documentation

The complete OpenAPI 3 specification lives in [`docs/openapi.yaml`](docs/openapi.yaml) — every endpoint, request/response schema, security scheme and references to RF/RNF/OCL requirements are documented there.

To explore it interactively:

- Open `docs/openapi.yaml` in [Swagger Editor](https://editor.swagger.io/) (drag and drop the file)

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/<org>/trento-live-activity.git
cd trento-live-activity/backend

# One-shot setup: creates PostgreSQL user/db, .env, runs npm install
npm run setup

# Start the development server (creates tables automatically)
npm run dev

# (Optional) populate the database with sample data
npm run seed
```

The setup script needs `sudo` access (for PostgreSQL user/db creation) and assumes PostgreSQL is installed and running.

To run the web client:

```bash
cd ../frontend
npm install
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `APPLE_CLIENT_ID` | Apple OAuth client ID |
| `FIREBASE_SERVER_KEY` | Firebase Cloud Messaging key |
| `SMTP_HOST` / `SMTP_PORT` | SMTP server configuration |
| `MAPS_API_KEY` | Map tiles API key (optional if using OSM) |

---

## Project Deliverables

| Deliverable | Deadline | Status |
|-------------|----------|--------|
| D1 — Requirements, Use Cases, BPMN | 27/03/2026 | ✅ Submitted |
| Pitch — Comune di Trento | 01/04/2026 | ✅ Submitted |
| D2 — Component Diagram, Class Diagram, OCL | 24/04/2026 | ✅ Submitted |
| D3 — Sprint 1 | 15/05/2026 | ✅ Submitted |
| D4 — Sprint 2 | 07/06/2026 | ✅ Submitted |
| 🌟 Making Trento Live Activity the everyday companion every Trentino deserves | ∞ | 🚀 Ongoing |

---

## Team

| Name | Student ID | GitHub |
|------|-----------|--------|
| Anas Soussane | 243731 | @[TBD] |
| Filippo Marcatili | 243199 | @[TBD] |
| Saif Safi | 245473 | @[TBD] |

---

## License

Academic project — University of Trento · a.a. 2025-2026. All rights reserved.

<div align="center">
<br/>

**Trento Live Activity**

*perché i programmi pubblici non valgono nulla se non sai come accedervi*

🏔️

</div>
