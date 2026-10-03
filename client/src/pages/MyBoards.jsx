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
      <div id="my-boards-header">
        <span className="brand">
          SyncBoard <span>— {user?.name}</span>
        </span>
        <div className="nav-group">
          <button type="button" className="btn btn-sm" onClick={() => navigate('/')}>
            🏠 Home
          </button>
          <button type="button" className="btn btn-sm" onClick={() => navigate('/board')}>
            ➕ New Board
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <section id="my-boards">
        <h1>My Boards</h1>
        <p>Load a saved board to continue drawing, or delete one you no longer need.</p>

        {loading ? (
          <p className="empty-state">Loading boards…</p>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <p>No boards yet.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/board')}>
              Start a new board
            </button>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((board) => (
              <div key={board._id} className="board-card">
                <div className="title">{board.title || 'Untitled Board'}</div>
                <div className="meta">
                  Updated: {new Date(board.updatedAt).toLocaleString()}
                </div>
                <div className="card-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/board?id=${board._id}`)}>
                    Load
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={deleting === board._id}
                    onClick={() => handleDelete(board._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
