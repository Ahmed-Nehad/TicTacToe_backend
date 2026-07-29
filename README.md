# TicTacToe Backend

Real-time multiplayer backend for the [TicTacToe frontend](https://github.com/Ahmed-Nehad/TicTacToe), built with Node.js, Express, and Socket.io. The server acts as a lightweight, stateless relay for matchmaking and move synchronization, keeping game logic and state entirely on the client for minimal latency.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Socket.io Core](#socketio-core)
  - [Bidirectional State Sync](#bidirectional-state-sync)
  - [Latency Handling](#latency-handling)
- [Frontend Integration](#frontend-integration)
- [Setup](#setup)
- [Deployment](#deployment)
- [License](#license)

---

## Features

- **Real-Time Multiplayer** — Bidirectional communication powered by Socket.io for instant move synchronization.
- **In-Memory Room Management** — Lightweight room creation, matchmaking, and cleanup with no external database dependency.
- **Stateless Relay Architecture** — The server never validates or stores game state; each client owns its own board, scores, and turn logic.
- **Reconnection Support** — Dedicated re-sync event restores game state after a dropped connection.
- **Low-Latency Design** — No database queries, no game logic execution, and no validation overhead on the server side.
- **TypeScript Codebase** — Fully typed server implementation (`server.ts`).

---

## Tech Stack

- **Node.js** + **Express** — HTTP server
- **Socket.io** — Real-time bidirectional communication
- **TypeScript** — Source written in `server.ts`

---

## Architecture

### Socket.io Core

**Connection & CORS**

```ts
const io = new Server(httpServer, { cors: { origin: "*" } });
```

**Room Management**

Rooms are tracked in memory:

```ts
interface room { id: string; p1: player; p2?: player; }
let rooms: room[] = [];
```

Core functions: `createRoom`, `freeRooms`, `getRoomIndexByRoomId`, `getRoomIndexByPlayerId`, `updateRoom`, `deleteRoom`.

**Events**

| Client → Server | Payload | Action |
|-------------------|-----------|----------|
| `join`  | `{ name, mode }` | Matchmaking: join an existing free room or create a new one. |
| `move`  | `{ pos, id }`    | Forward a move to the opponent in the same room. |

| Server → Client | Payload | Action |
|-------------------|-----------|----------|
| `ready`      | `{ id, p1, p2 }`        | Game starts; `start: socket.id === p1.id` determines the first turn. |
| `updateGame` | `pos`                   | Opponent's move — each client updates its own state. |
| `re`         | `{ id, p1, p2, start }` | Re-syncs state on reconnection. |
| `dis`        | –                       | Signals that the other player has disconnected. |

**Disconnection handling:** removes the player from their room, moves the remaining player to a new free room if one is available, or updates the room to a single-player state.

### Bidirectional State Sync

- The server is a thin relay — it does **not** validate or store game state.
- Each client independently maintains its own board, scores, and turn logic.
- On a move:
  1. Player A emits `move`.
  2. The server broadcasts `updateGame` to Player B.
  3. Both clients update their local boards independently.

This design keeps the server stateless, reduces load, and minimizes latency.

### Latency Handling

**Server-side:**
- In-memory storage (no database queries) — sub-millisecond access.
- No game logic execution — the server only forwards events.
- No validation overhead.

**Client-side (frontend):**
- Optimistic updates — the UI updates immediately.
- Turn locking (`useRef` — `canPlay`, `myturn`) prevents double-moves during network delays.
- Local state takes priority — the server is used only for synchronization.
- Reconnection handling via the `re` event.

---

## Frontend Integration

Frontend repository: [Ahmed-Nehad/TicTacToe](https://github.com/Ahmed-Nehad/TicTacToe) (React + Capacitor).

**Connection flow:**

```ts
const socket = ioConnect("https://tictactoe-backend-kvgn.onrender.com");
socket.emit("join", { name, mode: '' });
socket.on('ready', ({ id, p1, p2 }) => { /* start game */ });
```

**Key components:**
- `App.tsx` — socket connection management
- `OnlineSelect.tsx` — matchmaking UI
- `OnlineBoard.tsx` — turn and move synchronization

---

## Setup

```bash
git clone https://github.com/Ahmed-Nehad/TicTacToe_backend.git
cd TicTacToe_backend
npm install
npm start   # runs on http://localhost:3000
```

For the frontend, clone the [frontend repository](https://github.com/Ahmed-Nehad/TicTacToe), then run:

```bash
npm install && npm start
```

---

## Deployment

Ready for deployment on Render or Heroku.

**Live backend:** `https://tictactoe-backend-kvgn.onrender.com`

---

## License

ISC — see [LICENSE](https://github.com/Ahmed-Nehad/TicTacToe_backend?tab=ISC-1-ov-file).
