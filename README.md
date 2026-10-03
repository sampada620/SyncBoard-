# SyncBoard

**SyncBoard** is a real-time collaborative whiteboard application that lets multiple users draw together on the same canvas, save their work, and revisit boards later. Built as a full-stack web app with a React frontend, an Express backend, MongoDB Atlas persistence, and Socket.io for live synchronization.

## Features

- **User authentication** — Sign up and log in with email/password, backed by JWT tokens
- **Freehand drawing** — HTML5 Canvas with mouse and touch support
- **Drawing tools** — Color picker, brush size slider, eraser, and clear canvas
- **Board persistence** — Save boards to MongoDB Atlas and reload them later
- **My Boards** — List, open, and delete your saved boards
- **Real-time collaboration** — Multiple users in the same board room see each other's strokes live via Socket.io
- **Shareable board links** — Each board gets a unique URL that can be shared with collaborators

## Tech Stack

### Frontend
- React 19
- React Router
- Socket.io Client
- Vite
- HTML5 Canvas

### Backend
- Node.js
- Express
- Socket.io
- MongoDB Atlas (via Mongoose)
- JWT (jsonwebtoken)
- bcryptjs

## Project Structure

```
SyncBoard/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/            # API client helpers
│   │   ├── components/     # Whiteboard component
│   │   ├── context/        # Auth context provider
│   │   ├── pages/          # Login, Signup, Home, Board, MyBoards
│   │   ├── App.jsx         # Route definitions
│   │   ├── App.css         # Component styles
│   │   ├── index.css       # Global tokens and layout
│   │   └── socket.js       # Socket.io client setup
│   └── package.json
├── server/                 # Node.js + Express backend
│   ├── middleware/         # JWT authentication middleware
│   ├── models/             # Mongoose User and Board models
│   ├── routes/             # Auth and board API routes
│   ├── index.js            # Express + Socket.io server entrypoint
│   ├── .env                # Local environment variables (do not commit)
│   ├── .env.example        # Template for environment variables
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or a local MongoDB instance)

### 1. Clone the repository

```bash
git clone https://github.com/sampada620/SyncBoard-.git
cd SyncBoard
```

### 2. Install dependencies

```bash
cd client
npm install
cd ../server
npm install
```

### 3. Configure environment variables

Create a `.env` file in the `server/` directory. Use `.env.example` as a template:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
JWT_SECRET=your_jwt_secret_key_here
```

If you prefer to run MongoDB locally, you can use a local connection string such as:

```env
MONGO_URI=mongodb://127.0.0.1:27017/collaborative_whiteboard
```

> **Note:** Never commit your `.env` file. It contains real credentials and secrets.

### 4. Start the development servers

Open two terminal windows from the project root:

**Terminal 1 — Backend:**

```bash
cd server
npm run dev
```

The API server runs on `http://localhost:5000`.

**Terminal 2 — Frontend:**

```bash
cd client
npm run dev
```

The Vite dev server runs on `http://localhost:5173` (or the next available port).

### 5. Open the app

Navigate to `http://localhost:5173` in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/test` | Health check |
| POST | `/api/auth/signup` | Create a new user |
| POST | `/api/auth/login` | Log in and receive a JWT |
| GET | `/api/me` | Verify the current user |
| POST | `/api/boards` | Create a new board |
| GET | `/api/boards` | List your boards |
| GET | `/api/boards/:id` | Fetch a board by ID |
| PUT | `/api/boards/:id` | Update a board |
| DELETE | `/api/boards/:id` | Delete a board |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join a board room |
| `draw-stroke` | Client ↔ Server | Broadcast a drawn stroke |
| `clear-canvas` | Client → Server | Clear the canvas for everyone in the room |
| `user-joined` | Server → Client | Notify that a user joined |
| `user-left` | Server → Client | Notify that a user left |

## Development Phases

- Phase 1: Project setup (client + server + MongoDB)
- Phase 2: Authentication (JWT signup/login)
- Phase 3: Canvas drawing (freehand, mouse, touch)
- Phase 4: Board save/load (MongoDB-backed boards)
- Phase 5: Real-time sync (Socket.io rooms)
- Phase 6: CSS styling and README

## License

MIT
