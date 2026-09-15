import api from "./axios";

// ── Board API ─────────────────────────────────────────────────────────────────
// Thin wrapper around the /api/boards endpoints.
// The axios instance already injects the JWT, so these calls are
// authenticated automatically.

// POST /api/boards — create a new board (optionally with initial strokes)
export function createBoard({ title, strokes } = {}) {
  return api.post("/boards", { title, strokes });
}

// GET /api/boards — list all boards owned by the current user
export function listBoards() {
  return api.get("/boards");
}

// GET /api/boards/:id — fetch a single board (including its strokes)
export function getBoard(id) {
  return api.get(`/boards/${id}`);
}

// PUT /api/boards/:id — update title and/or strokes of an existing board
export function updateBoard(id, { title, strokes } = {}) {
  return api.put(`/boards/${id}`, { title, strokes });
}

// DELETE /api/boards/:id — permanently delete a board
export function deleteBoard(id) {
  return api.delete(`/boards/${id}`);
}