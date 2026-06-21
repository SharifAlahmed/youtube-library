import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider }    from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider }     from './context/AuthContext'
import { LibraryProvider, useLibrary } from './context/LibraryContext'
import ProtectedRoute  from './components/ProtectedRoute'
import Header          from './components/Header'
import AddVideoModal   from './components/AddVideoModal'
import LandingPage        from './pages/LandingPage'
import LoginPage          from './pages/LoginPage'
import HomePage           from './pages/HomePage'
import PromptsPage        from './pages/PromptsPage'
import CollectionsPage    from './pages/CollectionsPage'
import ResetPasswordPage  from './pages/ResetPasswordPage'

function AppShell() {
  const { showAddModal, closeAddModal } = useLibrary()
  return (
    <div className="min-h-screen transition-colors duration-200" style={{ background: 'var(--bg)' }}>
      <Header />
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="prompts" element={<PromptsPage />} />
        <Route path="collections" element={<CollectionsPage />} />
      </Routes>
      {showAddModal && <AddVideoModal onClose={closeAddModal} />}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/"               element={<LandingPage />} />
              <Route path="/login"          element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {/* Protected app */}
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <LibraryProvider>
                      <AppShell />
                    </LibraryProvider>
                  </ProtectedRoute>
                }
              />
              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
