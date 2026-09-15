import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Whiteboard from '../components/Whiteboard';
import { useAuth } from '../context/AuthContext';
import { getBoard } from '../api/boards';

export default function Board() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const boardId = searchParams.get('id');

  const [savedStrokes, setSavedStrokes] = useState([]);
  const [loading, setLoading] = useState(!!boardId);
  const [copied, setCopied] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load an existing board when the id query param is present
  useEffect(() => {
    if (!boardId) {
      setSavedStrokes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getBoard(boardId)
      .then(({ data }) => {
        if (!cancelled) {
          setSavedStrokes(data.strokes || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load board:', err);
        if (!cancelled) {
          setSavedStrokes([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boardId]);

  return (
    <div id="board-page">
      {/* Header: user info + navigation + actions */}
      <div
        id="board-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #ddd',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span>
          <strong>SyncBoard</strong> — {user?.name} ({user?.email})
          {boardId && (
            <span style={{ marginLeft: '8px', color: '#666', fontSize: '13px' }}>
              Room ID: <code>{boardId}</code>
            </span>
          )}
        </span>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {boardId && (
            <button id="btn-copy-link" type="button" onClick={copyShareLink}>
              {copied ? '✅ Link Copied!' : '🔗 Share Link'}
            </button>
          )}
          <button id="btn-my-boards" type="button" onClick={() => navigate('/boards')}>
            📋 My Boards
          </button>
          <button id="btn-new-board" type="button" onClick={() => navigate('/board')}>
            ➕ New Board
          </button>
          <button id="btn-logout" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Canvas drawing area */}
      {loading ? (
        <p style={{ padding: '16px' }}>Loading board…</p>
      ) : (
        <Whiteboard
          savedStrokes={savedStrokes}
          boardId={boardId}
          onBoardCreated={(newId) => {
            navigate(`/board?id=${newId}`, { replace: true });
          }}
        />
      )}
    </div>
  );
}