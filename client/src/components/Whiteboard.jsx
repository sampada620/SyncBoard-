import { useCallback, useEffect, useRef, useState } from 'react';
import { createBoard, updateBoard } from '../api/boards';
import { useAuth } from '../context/AuthContext';
import { initSocket } from '../socket';

/**
 * Whiteboard — freehand drawing canvas with basic tools and real-time Socket.io sync.
 *
 * Tools:
 *  - Freehand draw (mouse & touch)
 *  - Color picker
 *  - Brush size slider
 *  - Eraser
 *  - Clear canvas button (syncs across room)
 *  - Save button — persists strokes to the backend
 *  - Real-time sync via Socket.io with timestamp-based conflict handling
 *
 * Props:
 *  - savedStrokes: optional array of stroke objects to load (for editing an existing board)
 *  - boardId: optional board ID (used for socket room and saving)
 *  - onBoardCreated: optional callback when a new board is created (receives new boardId)
 */
export default function Whiteboard({ savedStrokes, boardId, onBoardCreated }) {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  // useRef for drawing-state that doesn't need re-renders
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const currentStrokePoints = useRef([]);   // points collected during the current stroke
  const currentStrokeColor = useRef('#000000');
  const currentStrokeWidth = useRef(5);

  // Tool state (does trigger re-render for toolbar UI)
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);

  // Real-time connection state
  const [connected, setConnected] = useState(false);

  // Strokes tracked in React state so we can send them to the backend on save
  const [strokes, setStrokes] = useState([]);

  // Status message for save feedback & collaborator events
  const [status, setStatus] = useState('');

  // ── Helper: replay one stroke onto a context ───────────────────────────────
  const drawStrokeStatic = useCallback((ctx, stroke) => {
    const { points, color: strokeColor, lineWidth } = stroke;
    if (!points || points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }, []);

  // ── Canvas initialisation ──────────────────────────────────────────────────
  // Set the canvas buffer size to match its CSS-rendered pixel size,
  // then fill with white so eraser (white stroke) works correctly.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 1200;
    canvas.height = rect.height || 650;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ── Load saved strokes when boardId or savedStrokes change ──────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (savedStrokes && savedStrokes.length > 0) {
      // Sort saved strokes by timestamp for deterministic initial order
      const sorted = [...savedStrokes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      sorted.forEach((stroke) => {
        drawStrokeStatic(ctx, stroke);
      });
      setStrokes(sorted);
    } else {
      setStrokes([]);
    }
  }, [savedStrokes, drawStrokeStatic]);

  // ── Socket.io Real-Time Room & Event Subscription ──────────────────────────
  useEffect(() => {
    if (!boardId) {
      setConnected(false);
      return;
    }

    const socket = initSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', {
        boardId,
        user: { id: user?.id, name: user?.name || user?.email || 'User' },
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('user-joined', ({ user: joinedUser }) => {
      setStatus(`${joinedUser?.name || 'A user'} joined the board`);
      setTimeout(() => setStatus(''), 2500);
    });

    socket.on('user-left', ({ user: leftUser }) => {
      setStatus(`${leftUser?.name || 'A user'} left the board`);
      setTimeout(() => setStatus(''), 2500);
    });

    // Remote stroke received from another collaborator
    socket.on('draw-stroke', ({ stroke, timestamp }) => {
      const strokeTimestamp = stroke.timestamp || timestamp || Date.now();
      const remoteStroke = { ...stroke, timestamp: strokeTimestamp };

      setStrokes((prevStrokes) => {
        // Simple timestamp-based conflict handling:
        // Merge and sort all strokes by timestamp
        const updatedStrokes = [...prevStrokes, remoteStroke].sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
        );

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          const latestLocalTimestamp =
            prevStrokes.length > 0 ? (prevStrokes[prevStrokes.length - 1].timestamp || 0) : 0;

          // If the incoming stroke arrived out of timestamp order, redraw canvas to guarantee conflict resolution
          if (strokeTimestamp < latestLocalTimestamp) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            updatedStrokes.forEach((s) => drawStrokeStatic(ctx, s));
          } else {
            // In-order fast draw
            drawStrokeStatic(ctx, remoteStroke);
          }
        }

        return updatedStrokes;
      });
    });

    // Remote clear event
    socket.on('clear-canvas', () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      setStrokes([]);
      setStatus('Board cleared by collaborator');
      setTimeout(() => setStatus(''), 2500);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, user, drawStrokeStatic]);

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // ── Drawing handlers ───────────────────────────────────────────────────────
  const startDrawing = useCallback((e) => {
    const canvas = canvasRef.current;
    isDrawing.current = true;
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    currentStrokePoints.current = [pos];
    currentStrokeColor.current = isEraser ? '#ffffff' : color;
    currentStrokeWidth.current = isEraser ? brushSize * 3 : brushSize;
  }, [color, brushSize, isEraser]);

  const draw = useCallback(
    (e) => {
      if (!isDrawing.current || !lastPos.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const pos = getPos(e, canvas);

      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);

      const strokeColor = isEraser ? '#ffffff' : color;
      const strokeWidth = isEraser ? brushSize * 3 : brushSize;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Collect points for stroke tracking
      currentStrokePoints.current.push(pos);

      lastPos.current = pos;
    },
    [color, brushSize, isEraser],
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing.current && currentStrokePoints.current.length > 0) {
      const newStroke = {
        color: currentStrokeColor.current,
        lineWidth: currentStrokeWidth.current,
        points: [...currentStrokePoints.current],
        timestamp: Date.now(),
      };

      // Add to local state
      setStrokes((prev) => [...prev, newStroke]);

      // Broadcast stroke live to other users in the same board room
      if (socketRef.current && boardId) {
        socketRef.current.emit('draw-stroke', {
          boardId,
          stroke: newStroke,
          timestamp: newStroke.timestamp,
        });
      }
    }
    isDrawing.current = false;
    lastPos.current = null;
    currentStrokePoints.current = [];
  }, [boardId]);

  // ── Clear canvas ───────────────────────────────────────────────────────────
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setStrokes([]);
    setStatus('');

    // Broadcast clear canvas to room
    if (socketRef.current && boardId) {
      socketRef.current.emit('clear-canvas', { boardId });
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (strokes.length === 0) {
      setStatus('Nothing to save — draw something first!');
      return;
    }

    try {
      if (boardId) {
        // Update existing board
        await updateBoard(boardId, { strokes });
        setStatus(`Board saved successfully!`);
      } else {
        // Create new board
        const { data } = await createBoard({ strokes });
        setStatus(`Board "${data.title}" created!`);
        if (onBoardCreated) {
          onBoardCreated(data._id);
        }
      }
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setStatus('Save failed — check console');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div id="whiteboard-container">
      {/* ── Toolbar ── */}
      <div id="whiteboard-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid #ddd' }}>
        {/* Color picker */}
        <label htmlFor="color-picker" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Color:
          <input
            id="color-picker"
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setIsEraser(false);
            }}
          />
        </label>

        {/* Brush size */}
        <label htmlFor="brush-size" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          Size: <strong>{brushSize}px</strong>
          <input
            id="brush-size"
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </label>

        {/* Draw / Eraser toggle */}
        <button
          id="btn-draw"
          type="button"
          onClick={() => setIsEraser(false)}
          aria-pressed={!isEraser}
          style={{ fontWeight: !isEraser ? 'bold' : 'normal' }}
        >
          ✏️ Draw
        </button>

        <button
          id="btn-eraser"
          type="button"
          onClick={() => setIsEraser(true)}
          aria-pressed={isEraser}
          style={{ fontWeight: isEraser ? 'bold' : 'normal' }}
        >
          🧹 Eraser
        </button>

        {/* Clear */}
        <button id="btn-clear" type="button" onClick={clearCanvas}>
          🗑️ Clear
        </button>

        {/* Save */}
        <button id="btn-save" type="button" onClick={handleSave}>
          💾 Save
        </button>

        {/* Real-time status indicator */}
        <span
          id="sync-status"
          style={{
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: boardId ? (connected ? '#e6f4ea' : '#fef7e0') : '#f1f3f4',
            color: boardId ? (connected ? '#137333' : '#b06000') : '#5f6368',
            fontWeight: 'bold',
          }}
        >
          {boardId ? (connected ? '🟢 Live Room' : '🟡 Connecting...') : '⚪ Local Draft'}
        </span>

        {/* Status / feedback */}
        {status && (
          <span id="save-status" style={{ fontSize: '13px', color: '#1a73e8', marginLeft: '6px' }}>
            {status}
          </span>
        )}
      </div>

      {/* ── Canvas ── */}
      <canvas
        id="drawing-canvas"
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '650px',
          cursor: isEraser ? 'cell' : 'crosshair',
          border: '1px solid #ccc',
          background: '#ffffff',
          touchAction: 'none',
        }}
        // Mouse events
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        // Touch events
        onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
        onTouchMove={(e) => { e.preventDefault(); draw(e); }}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}