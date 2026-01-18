# Backend Setup (Signal Engine)

This repository contains the backend service for the Signal Engine system.
It runs an API server, an async worker, PostgreSQL, and Redis using Docker Compose.

---

## Requirements

- Docker
- Docker Compose

*(No local Node.js, PostgreSQL, or Redis required)*

---

## Environment Setup

Create a `.env` file in the project root with the following contents:

PORT=3000

DATABASE_URL=postgresql://postgres:postgres@signals_postgres:5432/signals_db

REDIS_URL=redis://signals_redis:6379

JWT_SECRET=super-secret-key

---

## Build & Start (Recommended)

Build and start API + Worker + PostgreSQL + Redis:

docker compose up --build -d

Check logs:

docker compose logs -f

Stop all services:

docker compose down

---

## Database Migrations

Run Prisma migrations inside the API container:

docker compose exec api npx prisma migrate deploy

---

## Seed Database

Seed tenants, users, and candle data:

docker compose exec api npx prisma db seed

---

## Run Tests

Run the full integration test suite (uses real PostgreSQL and Redis):

docker compose exec api npm test

---

## Notes

- API and Worker run as separate containers
- Redis is used for async job processing
- PostgreSQL persists all application data
- Tests are designed to run inside Docker (no mocks)
- `.env` must exist before starting containers
