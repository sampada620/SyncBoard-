const express = require("express");
const Board = require("../models/Board");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Every board endpoint requires a valid JWT
router.use(authMiddleware);

// ── Helper ───────────────────────────────────────────────────────────────────
// Find a board that exists AND belongs to the requesting user.
async function findOwnedBoard(boardId, userId, res) {
  const board = await Board.findById(boardId);
  if (!board) {
    res.status(404).json({ message: "Board not found" });
    return null;
  }
  if (board.ownerId.toString() !== userId) {
    res.status(403).json({ message: "Forbidden — you do not own this board" });
    return null;
  }
  return board;
}

// ── POST /api/boards ─────────────────────────────────────────────────────────
// Create a new board. Body: { title?, strokes? }
router.post("/", async (req, res) => {
  try {
    const { title, strokes } = req.body;
    const board = await Board.create({
      title: title || "Untitled Board",
      ownerId: req.user.userId,
      strokes: strokes || [],
    });
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET /api/boards ──────────────────────────────────────────────────────────
// List all boards owned by the requesting user.
// Returns lightweight documents (no strokes array) for the list view.
router.get("/", async (req, res) => {
  try {
    const boards = await Board.find({ ownerId: req.user.userId })
      .select("title createdAt updatedAt") // omit strokes for performance
      .sort({ updatedAt: -1 }); // most recently edited first
    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET /api/boards/:id ──────────────────────────────────────────────────────
// Fetch a single board (including its strokes) by ID.
// Any authenticated user who has the board link/ID can view it.
router.get("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    res.json(board);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── PUT /api/boards/:id ──────────────────────────────────────────────────────
// Update title and/or strokes of an existing board.
// Body: { title?, strokes? }
router.put("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (req.body.title !== undefined) board.title = req.body.title;
    if (req.body.strokes !== undefined) board.strokes = req.body.strokes;

    await board.save();
    res.json(board);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── DELETE /api/boards/:id ───────────────────────────────────────────────────
// Permanently delete a board (only the owner may delete).
router.delete("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (board.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden — only the owner can delete this board" });
    }

    await board.deleteOne();
    res.json({ message: "Board deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
