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
      <div id="board-header">
        <span className="brand">
          SyncBoard <span>— {user?.name}</span>
        </span>
        <div className="nav-group">
          {boardId && (
            <button id="btn-copy-link" type="button" className="btn btn-sm" onClick={copyShareLink}>
              {copied ? '✅ Link Copied!' : '🔗 Share Link'}
            </button>
          )}
          <button id="btn-my-boards" type="button" className="btn btn-sm" onClick={() => navigate('/boards')}>
            📋 My Boards
          </button>
          <button id="btn-new-board" type="button" className="btn btn-sm" onClick={() => navigate('/board')}>
            ➕ New Board
          </button>
          <button id="btn-logout" type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Loading board…</p>
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
