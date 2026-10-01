# Secret Suspects

A bilingual Arabic/English multiplayer social deduction party game for 2–10 friends.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:10000` in two or more browser tabs. The server owns rooms, phases, timers, guesses, abilities and elimination results. WebSocket traffic uses `/ws`.

## Render deployment

Create a Render Web Service from this repository:

- Build: `npm install`
- Start: `npm start`
- Health check: `/health`
- Plan: Free for testing

The service serves the client and authoritative WebSocket server from the same origin. Render free services sleep after idle periods and in-memory rooms are lost on restarts; use a persistent database/Redis before production scale.
