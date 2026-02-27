import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/common/Navbar';
import Loading from '@/components/common/Loading';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Bikes from '@/pages/Bikes';
import Panic from '@/pages/Panic';
import Users from '@/pages/Users';
import '@/styles/globals.css';
import Minutes from './pages/Minute';
import Reports from '@/pages/Reports';

// Protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
    </>
  );
};

// Public Route Component
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bikes"
        element={
          <ProtectedRoute>
            <Bikes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
            <Users />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/minutes"
        element={
          <ProtectedRoute>
            <Minutes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/panic"
        element={
          <ProtectedRoute>
            <Panic />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['admin', 'coordinator', 'supervisor']}>
            <Reports />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* 404 */}
      <Route
        path="*"
        element={
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>404 - Página no encontrada</h1>
            <a href="/dashboard">Volver al Dashboard</a>
          </div>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
