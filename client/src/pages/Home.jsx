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
    <section id="center">
      <h1>Welcome, {user?.name}!</h1>
      <p>You're logged in as {user?.email}</p>
      <button type="button" onClick={() => navigate('/board')}>
        🎨 Open Board
      </button>
      <button type="button" onClick={() => navigate('/boards')} style={{ marginLeft: '8px' }}>
        📋 My Boards
      </button>
      <button type="button" onClick={handleLogout} style={{ marginLeft: '8px' }}>
        Logout
      </button>
    </section>
  );
}