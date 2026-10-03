import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <section id="center" className="home">
      <div className="home-card">
        <h1>Welcome, {user?.name}!</h1>
        <p>You're logged in as {user?.email}</p>
        <div className="home-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/board')}>
            🎨 Open Board
          </button>
          <button type="button" className="btn" onClick={() => navigate('/boards')}>
            📋 My Boards
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </section>
  );
}
