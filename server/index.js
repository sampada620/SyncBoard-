require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const boardRoutes = require("./routes/boards");
const authMiddleware = require("./middleware/auth");

const http = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket.io event handling
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join a specific whiteboard room
  socket.on("join-room", ({ boardId, user }) => {
    if (!boardId) return;
    socket.join(boardId);
    socket.currentBoardId = boardId;
    socket.user = user;
    console.log(`Socket ${socket.id} (${user?.name || "Anonymous"}) joined room ${boardId}`);

    // Notify other clients in the room
    socket.to(boardId).emit("user-joined", {
      socketId: socket.id,
      user,
    });
  });

  // Receive a drawn stroke and broadcast to other users in the same room
  socket.on("draw-stroke", ({ boardId, stroke, timestamp }) => {
    if (!boardId || !stroke) return;
    const strokeTimestamp = stroke.timestamp || timestamp || Date.now();
    const enrichedStroke = { ...stroke, timestamp: strokeTimestamp };

    // Broadcast stroke to other room members
    socket.to(boardId).emit("draw-stroke", {
      boardId,
      stroke: enrichedStroke,
      timestamp: strokeTimestamp,
      userId: socket.user?.id,
    });
  });

  // Canvas clear event broadcast
  socket.on("clear-canvas", ({ boardId }) => {
    if (!boardId) return;
    socket.to(boardId).emit("clear-canvas", { boardId });
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (socket.currentBoardId) {
      socket.to(socket.currentBoardId).emit("user-left", {
        socketId: socket.id,
        user: socket.user,
      });
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Test route (public)
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running successfully" });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Board routes (all protected via authMiddleware inside the router)
app.use("/api/boards", boardRoutes);

// Protected route example
app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ userId: req.user.userId, message: "Authenticated" });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collaborative_whiteboard")
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
