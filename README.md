# Simple 3-Tier Realtime Chat App

A minimal 3-tier realtime 1-on-1 chat application built with:

- **Database Tier**: PostgreSQL (`docker-compose.yml`)
- **Backend Tier**: Express + Prisma ORM + `ws` (WebSockets) + `bcryptjs` + JWT
- **Frontend Tier**: React + Vite

## Features

- Email & password Sign Up and Login (passwords hashed with `bcryptjs`)
- User list with live online/offline presence
- 1-on-1 realtime messaging via WebSockets (persisted in PostgreSQL via Prisma)

## Quick Start

1. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```

2. Run Backend:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```

3. Run Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Open http://localhost:5173 in two browser windows to sign up as two users and chat in real time.
