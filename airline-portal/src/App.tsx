import { BrowserRouter, Route, Routes } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import About from './pages/About';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import LanguageSelection from './pages/LanguageSelection';
import Legal from './pages/Legal';
import Login from './pages/Login';
import Privacy from './pages/Privacy';
import Signup from './pages/Signup';
import Terms from './pages/Terms';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LanguageSelection />} />
            <Route path="/select-language" element={<LanguageSelection />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/about" element={<About />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/history"
              element={
                <PrivateRoute>
                  <History />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
