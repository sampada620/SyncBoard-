import { useCallback, useEffect, useRef, useState } from 'react';
import { createBoard, updateBoard } from '../api/boards';
import { useAuth } from '../context/AuthContext';
import { initSocket } from '../socket';

export default function Whiteboard({ savedStrokes, boardId, onBoardCreated }) {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const currentStrokePoints = useRef([]);
  const currentStrokeColor = useRef('#000000');
  const currentStrokeWidth = useRef(5);

  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [connected, setConnected] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [status, setStatus] = useState('');

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (savedStrokes && savedStrokes.length > 0) {
      const sorted = [...savedStrokes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      sorted.forEach((stroke) => drawStrokeStatic(ctx, stroke));
      setStrokes(sorted);
    } else {
      setStrokes([]);
    }
  }, [savedStrokes, drawStrokeStatic]);

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

    socket.on('disconnect', () => setConnected(false));

    socket.on('user-joined', ({ user: joinedUser }) => {
      setStatus(`${joinedUser?.name || 'A user'} joined the board`);
      setTimeout(() => setStatus(''), 2500);
    });

    socket.on('user-left', ({ user: leftUser }) => {
      setStatus(`${leftUser?.name || 'A user'} left the board`);
      setTimeout(() => setStatus(''), 2500);
    });

    socket.on('draw-stroke', ({ stroke, timestamp }) => {
      const strokeTimestamp = stroke.timestamp || timestamp || Date.now();
      const remoteStroke = { ...stroke, timestamp: strokeTimestamp };

      setStrokes((prevStrokes) => {
        const updatedStrokes = [...prevStrokes, remoteStroke].sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
        );
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          const latestLocalTimestamp =
            prevStrokes.length > 0 ? (prevStrokes[prevStrokes.length - 1].timestamp || 0) : 0;
          if (strokeTimestamp < latestLocalTimestamp) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            updatedStrokes.forEach((s) => drawStrokeStatic(ctx, s));
          } else {
            drawStrokeStatic(ctx, remoteStroke);
          }
        }
        return updatedStrokes;
      });
    });

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
      setStrokes((prev) => [...prev, newStroke]);
      if (socketRef.current && boardId) {
        socketRef.current.emit('draw-stroke', { boardId, stroke: newStroke, timestamp: newStroke.timestamp });
      }
    }
    isDrawing.current = false;
    lastPos.current = null;
    currentStrokePoints.current = [];
  }, [boardId]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setStrokes([]);
    setStatus('');
    if (socketRef.current && boardId) {
      socketRef.current.emit('clear-canvas', { boardId });
    }
  };

  const handleSave = async () => {
    if (strokes.length === 0) {
      setStatus('Nothing to save — draw something first!');
      return;
    }
    try {
      if (boardId) {
        await updateBoard(boardId, { strokes });
        setStatus('Board saved successfully!');
      } else {
        const { data } = await createBoard({ strokes });
        setStatus(`Board "${data.title}" created!`);
        if (onBoardCreated) onBoardCreated(data._id);
      }
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setStatus('Save failed — check console');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const syncClass = boardId
    ? connected
      ? 'live'
      : 'connecting'
    : 'draft';

  return (
    <div id="whiteboard-container">
      <div id="whiteboard-toolbar">
        <div className="tool-group">
          <label htmlFor="color-picker">Color:</label>
          <input
            id="color-picker"
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setIsEraser(false);
            }}
          />
        </div>

        <div className="divider" />

        <div className="tool-group">
          <label htmlFor="brush-size">
            Size: <strong>{brushSize}px</strong>
          </label>
          <input
            id="brush-size"
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>

        <div className="divider" />

        <button id="btn-draw" type="button" className="tool-btn" aria-pressed={!isEraser} onClick={() => setIsEraser(false)}>
          ✏️ Draw
        </button>
        <button id="btn-eraser" type="button" className="tool-btn" aria-pressed={isEraser} onClick={() => setIsEraser(true)}>
          🧹 Eraser
        </button>

        <div className="divider" />

        <button id="btn-clear" type="button" className="btn btn-ghost btn-sm" onClick={clearCanvas}>
          🗑️ Clear
        </button>
        <button id="btn-save" type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          💾 Save
        </button>

        <span id="sync-status" className={syncClass}>
          {boardId ? (connected ? '🟢 Live Room' : '🟡 Connecting...') : '⚪ Local Draft'}
        </span>
        {status && (
          <span id="save-status">{status}</span>
        )}
      </div>

      <canvas
        id="drawing-canvas"
        ref={canvasRef}
        className={isEraser ? 'eraser' : ''}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
        onTouchMove={(e) => { e.preventDefault(); draw(e); }}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}