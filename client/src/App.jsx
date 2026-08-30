import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ApiRegister from './components/ApiRegister';
import ApiDetails from './components/ApiDetails';

// Simple Protected Route wrapper to guard access
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Dashboard & Operations Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/apis/register" 
          element={
            <ProtectedRoute>
              <ApiRegister />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/apis/edit/:id" 
          element={
            <ProtectedRoute>
              <ApiRegister />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/apis/:id" 
          element={
            <ProtectedRoute>
              <ApiDetails />
            </ProtectedRoute>
          } 
        />

        {/* Fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
