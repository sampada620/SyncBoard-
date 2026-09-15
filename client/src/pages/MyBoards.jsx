import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deleteBoard, listBoards } from '../api/boards';

export default function MyBoards() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    listBoards()
      .then(({ data }) => setBoards(data))
      .catch((err) => {
        console.error('Failed to load boards:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (boardId) => {
    try {
      await deleteBoard(boardId);
      setBoards((prev) => prev.filter((board) => board._id !== boardId));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  return (
    <div id="my-boards-page">
      {/* Header: who's logged in + nav buttons + logout */}
      <div id="board-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #ddd' }}>
        <span>
          <strong>SyncBoard</strong> — {user?.name} ({user?.email})
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => navigate('/')}>
            🏠 Home
          </button>
          <button type="button" onClick={() => navigate('/board')}>
            ➕ New Board
          </button>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <section id="my-boards" style={{ padding: '16px' }}>
        <h1>My Boards</h1>
        <p>
          Load a saved board to continue drawing, or delete a board you no longer need.
        </p>

        {loading ? (
          <p style={{ padding: '16px' }}>Loading boards…</p>
        ) : boards.length === 0 ? (
          <p style={{ padding: '16px' }}>
            No boards yet. <button type="button" onClick={() => navigate('/board')}>Start a new board</button>.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {boards.map((board) => (
              <div
                key={board._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '8px',
                }}
              >
                <span>
                  <strong>{board.title || 'Untitled Board'}</strong>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Updated: {new Date(board.updatedAt).toLocaleString()}
                  </div>
                </span>
                <span style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => navigate(`/board?id=${board._id}`)}>
                    Load
                  </button>
                  <button
                    type="button"
                    disabled={deleting === board._id}
                    onClick={() => handleDelete(board._id)}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}