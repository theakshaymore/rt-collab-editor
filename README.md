# Real Time Collab Editor

A real-time collaborative document editor with live chat functionality, built with Node.js, Socket.IO, and Redis.

## Features

- Real-time collaborative text editing
- Live user presence indicators
- Built-in chat functionality
- Document persistence with PostgreSQL
- Redis-based caching and presence management

## Architecture

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: Vite + vanilla JS/HTML
- **Database**: PostgreSQL for document storage
- **Cache**: Redis for presence and document caching
- **Strategy**: Last-Writer-Wins (LWW) with debounced persistence

## Prerequisites

- Docker and Docker Compose
- Node.js (v16 or higher)
- PostgreSQL client tools (psql) - optional, for manual migration

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rt-collab-editor
```

### 2. Start Services with Docker

```bash
docker-compose up -d
```

This will start PostgreSQL and Redis containers.

### 3. Run Database Migrations

Choose one of the following methods:

**Option A: From host machine (requires psql)**

```bash
PGPASSWORD=pgpass psql -h localhost -U pguser -d rtcollab -f backend/src/migrations/001_create_tables.sql
```

**Option B: Inside Docker container**

```bash
# First, find the PostgreSQL container ID
docker ps

# Then run the migration inside the container
docker exec -it <postgres-container-id> psql -U pguser -d rtcollab -c "\i /docker-entrypoint-initdb.d/001_create_tables.sql"
```

### 4. Start the Backend Server

```bash
cd backend
npm install
NODE_ENV=development node src/server.js
```

The backend will start on `http://localhost:3000`

### 5. Start the Frontend Development Server

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the URL shown in the terminal).

### 6. Test the Application

1. Open two browser tabs
2. Navigate to the frontend URL in both tabs
3. Login with different usernames in each tab
4. Create or open a document
5. Test real-time editing and chat functionality

## Docker Services

The `docker-compose.yml` includes:

- **PostgreSQL**: Database server (port 5432)
  - Database: `rtcollab`
  - User: `pguser`
  - Password: `pgpass`
- **Redis**: Cache and pub/sub (port 6379)

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5173, 5432, and 6379 are available
2. **Database connection**: Verify PostgreSQL container is running with `docker ps`
3. **Migration errors**: Check that the migration file path is correct
4. **Frontend not loading**: Ensure Vite dev server started successfully

### Logs

View service logs:

```bash
docker-compose logs postgres
docker-compose logs redis
```

### Reset Database

To reset the database:

```bash
docker-compose down
docker volume rm <project-name>_postgres_data
docker-compose up -d
# Re-run migrations
```

## Project Structure

```
rt-collab-editor/
├── backend/
│   ├── src/
│   │   ├── migrations/
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── README.md
```
