import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "/");

export function initSocket() {
  return io(SOCKET_URL, {
    autoConnect: true,
    transports: ["websocket", "polling"],
  });
}
