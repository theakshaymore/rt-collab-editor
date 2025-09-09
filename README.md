# RT Collab Editor - Minimal Demo

## Setup (local, using Docker)

1. Clone repo
2. Start services:
   docker-compose up -d

csharp
Copy code

3. Run DB migrations (on host machine with psql installed), or run inside the postgres container:
   host:
   PGPASSWORD=pgpass psql -h localhost -U pguser -d rtcollab -f backend/src/migrations/001_create_tables.sql

or inside container:
docker exec -it <postgres-container-id> psql -U pguser -d rtcollab -f /path/to/migrations/001_create_tables.sql

markdown
Copy code

4. Start backend:
   cd backend
   npm install
   NODE_ENV=development node src/server.js

markdown
Copy code

5. Start frontend:
   cd frontend
   npm install
   npm run dev

open http://localhost:5173 (vite default) or the shown URL
pgsql
Copy code

6. Open two browser tabs, login with different usernames, create/open doc, test editing + chat.

## Notes

- Backend: Node + Express + Socket.IO. Uses a simple LWW version strategy and debounce persistence.
- Redis stores presence and doc cache.
- This minimal app focuses on clarity for a 3-day build; it's not production hardened (no auth tokens, no input sanitization in the frontend).
