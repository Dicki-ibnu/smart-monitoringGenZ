import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import AnomalyPage from './pages/AnomalyPage';
import ScannerPage from './pages/ScannerPage';
import InsightsPage from './pages/InsightsPage';
import GamificationPage from './pages/GamificationPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Bungkus dengan ThemeProvider di dalam AuthProvider */}
        <ThemeProvider>
          <Routes>
            {/* Rute Publik: Hanya bisa diakses kalau BELUM login */}
            <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
            
            {/* Rute Terlindungi: WAJIB login. Dibungkus dengan Layout utama */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              {/* Halaman utama saat buka localhost:5173/ */}
              <Route index element={<DashboardPage />} />
              
              {/* Penyelamat Redirect Google OAuth */}
              <Route path="dashboard" element={<DashboardPage />} />
              
              {/* Menu-menu lainnya */}
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="anomaly" element={<AnomalyPage />} />
              <Route path="scanner" element={<ScannerPage />} />
              <Route path="insights" element={<InsightsPage />} />
              
              {/* Rute Rewards sekarang sudah AMAN di dalam Layout */}
              <Route path="rewards" element={<GamificationPage />} />
            </Route>

            {/* Lempar ke halaman utama jika user mengetik URL ngawur */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;