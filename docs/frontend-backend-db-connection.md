# Frontend, Backend, and PostgreSQL Connection

This project uses PostgreSQL as the database server. pgAdmin is only a visual administration tool for inspecting and managing that PostgreSQL server; the web app never connects to pgAdmin.

## Architecture

The frontend does not connect directly to PostgreSQL and must not contain database credentials.

```text
React/Vite frontend
  -> HTTP JSON API under /api
  -> Express backend
  -> Sequelize query layer
  -> PostgreSQL
```

The database seeded by `npm run seed` is read by the Express backend through Sequelize models in `backend/src/data/models`.

## Stack Detected

- Frontend: React 18, TypeScript, Vite, React Router.
- Backend: Node.js, Express.
- Database: PostgreSQL.
- Query layer: Sequelize using the `pg` driver.
- Database connection: `backend/src/data/db.js`, using `DATABASE_URL`.
- Seed script: `backend/src/data/seed.js`.
- Models: `User`, `Activity`, `Event`, `Participation`, `POI`, `Report`.

## Environment Variables

Backend variables live in `backend/.env`.

```bash
DATABASE_URL=postgres://user:password@localhost:5432/trento_live
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
MOCK_CURRENT_USER_EMAIL=mario.rossi@example.com
```

`MOCK_CURRENT_USER_EMAIL` is temporary. It lets `/api/users/me` return one seeded user until frontend authentication is fully wired.

Optional frontend override:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

For normal Vite development this is not required because `frontend/vite.config.ts` proxies `/api` to `http://localhost:3000`.

## Local Workflow

From `backend/`:

```bash
npm install
npm run db:sync
npm run seed
npm run dev
```

There is no dedicated migration system yet. The current project uses Sequelize `sync({ alter: true })` in development and `npm run db:sync` for schema creation.

From `frontend/` in a second terminal:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## API Endpoints

These endpoints are mounted under `/api/*` for the frontend. Legacy non-prefixed backend routes such as `/events`, `/activities`, and `/map` are still available.

### `GET /api/events`

Returns:

```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Mostra...",
      "description": "Descrizione",
      "location": "Castello del Buonconsiglio",
      "dateTime": "2026-05-22T10:00:00",
      "isCertified": true,
      "category": "arte",
      "createdAt": "2026-05-12T10:00:00.000Z",
      "latitude": 46.0719,
      "longitude": 11.1234
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### `GET /api/events/:id`

Returns one event in the same item shape. Invalid UUIDs return `400 INVALID_ID`; missing events return `404 NOT_FOUND`.

### `GET /api/activities`

Returns:

```json
{
  "activities": [
    {
      "id": "uuid",
      "title": "Attività di Sport",
      "description": null,
      "category": "sport",
      "location": "Stadio Briamasco",
      "participantCount": 2,
      "maxParticipants": 10,
      "createdAt": "2026-05-12T10:00:00.000Z",
      "dateTime": "2026-05-15T18:00:00",
      "status": "attiva",
      "latitude": 46.0631,
      "longitude": 11.11
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### `GET /api/activities/:id`

Returns one activity in the same item shape. Invalid UUIDs return `400 INVALID_ID`; missing activities return `404 NOT_FOUND`.

### `GET /api/users/me`

Temporary unauthenticated endpoint for V1 frontend bootstrapping. It returns the seeded user configured by `MOCK_CURRENT_USER_EMAIL`, or an anonymous fallback when the user table is empty.

### `GET /api/map`

Returns markers generated from seeded POIs, activities, and events:

```json
{
  "markers": [
    {
      "id": "event:uuid",
      "type": "event",
      "title": "Concerto al MUSE",
      "latitude": 46.0666,
      "longitude": 11.113,
      "crowdLevel": 90,
      "crowdingStatus": "red",
      "isCertified": true,
      "sourceId": "uuid",
      "category": "musica",
      "description": "Musica classica nella corte del museo.",
      "dateTime": "2026-05-27T20:30:00"
    }
  ],
  "pois": [],
  "activities": [],
  "events": []
}
```

`crowdLevel` is a frontend-friendly 0-100 density/popularity score. `crowdingStatus` is normalized for the frontend as `green`, `yellow`, `orange`, or `red` from database crowding values, participation ratios, and event popularity.

## Frontend API Calls

Frontend API functions are centralized in `frontend/src/lib/api.ts`:

- `getEvents()`
- `getEventById(id)`
- `getActivities()`
- `getActivityById(id)`
- `getMapMarkers()`
- `getCurrentUser()`

Pages use these helpers instead of calling `fetch` directly.

## Interactive Map Provider

The map UI uses Leaflet with free OpenStreetMap raster tiles and `leaflet.markercluster` for marker clustering. It does not require Google Maps or paid API credentials. The Leaflet implementation lives in `frontend/src/components/map/MapCanvas.tsx`; visual map styling, density glow overlays, marker colors, popups, and responsive behavior are defined in `frontend/src/styles/globals.css`.

## CORS and Development Proxy

The backend allows `http://localhost:5173` and `http://127.0.0.1:5173` by default, plus any origins configured in `FRONTEND_URL` or `CORS_ORIGIN`.

The Vite dev server proxies frontend requests from `/api/*` to `http://localhost:3000`, so browser requests can use same-origin paths such as `/api/events`.

## Known Limitations

- `/api/users/me` is a temporary seeded-user bridge, not real authentication.
- There is no production migration tool yet; Sequelize sync is still used for development schema management.
- The map is still a polished local canvas placeholder, not Mapbox, Leaflet, or Google Maps.
- Event and activity creation flows remain backend-only for now; the implemented frontend work is read-only display of seeded data.
