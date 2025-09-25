import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import AuthForm from '@/components/auth/AuthForm';
import Dashboard from '@/pages/Dashboard';
import PlayersPage from '@/pages/PlayersPage';
import NewMatchPage from '@/pages/NewMatchPage';
import ScoringPage from '@/pages/ScoringPage';
import LeaderboardsPage from '@/pages/LeaderboardsPage';

// Créer le client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Ne pas retry les erreurs d'authentification
        if (error?.code === 'permission-denied') return false;
        return failureCount < 3;
      }
    },
    mutations: {
      retry: 1
    }
  }
});

// Enregistrer le service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Route d'authentification */}
            <Route path="/auth" element={<AuthForm />} />

            {/* Routes protégées */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="players" element={<PlayersPage />} />
              <Route path="new-match" element={<NewMatchPage />} />
              <Route path="scoring/:matchId" element={<ScoringPage />} />
              <Route path="leaderboards" element={<LeaderboardsPage />} />
            </Route>

            {/* Redirection par défaut */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>

      {/* Dev tools en mode développement */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;