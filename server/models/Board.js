const mongoose = require("mongoose");

// ── Stroke sub-document ─────────────────────────────────────────────────────
// Represents one continuous pen-down → pen-up gesture.
// Points are stored in canvas-buffer coordinates (already scale-corrected),
// so they can be replayed directly onto any same-size canvas.
const strokeSchema = new mongoose.Schema(
  {
    color: { type: String, default: "#000000" },
    lineWidth: { type: Number, default: 5 },
    timestamp: { type: Number, default: Date.now },
    points: [
      {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        _id: false, // no per-point _id needed
      },
    ],
  },
  { _id: false } // no per-stroke _id either — keeps the array lean
);

// ── Board document ──────────────────────────────────────────────────────────
const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Untitled Board",
      trim: true,
      maxlength: 100,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // optimises GET /api/boards (list by owner)
    },
    strokes: [strokeSchema],
  },
  { timestamps: true } // createdAt + updatedAt
);

module.exports = mongoose.model("Board", boardSchema);
