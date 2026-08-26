import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Compose from './pages/Compose';
import EmailView from './pages/EmailView';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import { Loader } from './components/UI/UI';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Guest Route wrapper (redirect if already logged in)
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" text="Loading..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/inbox" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Guest Routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SocketProvider>
              <AppLayout />
            </SocketProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<Dashboard />} />
        <Route path="sent" element={<Dashboard />} />
        <Route path="drafts" element={<Dashboard />} />
        <Route path="starred" element={<Dashboard />} />
        <Route path="spam" element={<Dashboard />} />
        <Route path="trash" element={<Dashboard />} />
        <Route path="archive" element={<Dashboard />} />
        <Route path="compose" element={<Compose />} />
        <Route path="email/:id" element={<EmailView />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="templates" element={<Templates />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                boxShadow: 'var(--shadow-lg)',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
