import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ScrollToTop from './components/Layout/ScrollToTop';
import Portfolio from './components/Dashboard/Portfolio';
import Dashboard from './components/Dashboard/Dashboard';
import Market from './components/Dashboard/Market';
import StockDetail from './components/Dashboard/StockDetail';
import ImportPage from './components/Dashboard/ImportPage';

import News from './components/Dashboard/News';
import { PortfolioProvider } from './context/PortfolioContext';


import LogsViewer from './components/LogsViewer';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { Navigate } from 'react-router-dom';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Protected Route Wrapper
// Redirects unauthenticated users to the landing page.
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

// Main Routing Component
// Handles conditionally rendering public vs protected routes based on auth state.
function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();



  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)] text-[var(--accent-green)]">Loading...</div>;
  }



  return (
    <Routes>
      {/* Public Route / Landing Page - if authenticated go to Dashboard */}
      <Route path="/" element={
        isAuthenticated ? <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute> : <LandingPage />
      } />

      {/* Login Route */}
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Protected Routes */}
      <Route path="/portfolio" element={
        <ProtectedRoute>
          <Layout><Portfolio /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/news" element={
        <ProtectedRoute>
          <Layout><News /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/stock/:ticker" element={
        <ProtectedRoute>
          <Layout><StockDetail /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/market" element={
        <ProtectedRoute>
          <Layout><Market /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/import" element={
        <ProtectedRoute>
          <Layout><ImportPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/logs" element={
        <ProtectedRoute>
          <Layout><LogsViewer /></Layout>
        </ProtectedRoute>
      } />

      {/* Catch all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <PortfolioProvider>
          <Router>
            <ScrollToTop />
            <AppRoutes />
          </Router>
        </PortfolioProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
