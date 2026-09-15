import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { useAuth } from './context/AuthContext'
import Board from './pages/Board'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MyBoards from './pages/MyBoards'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p>Loading...</p>
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/board" element={<ProtectedRoute><Board /></ProtectedRoute>} />
      <Route path="/boards" element={<ProtectedRoute><MyBoards /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
