import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LanguageSelector from "./components/LanguageSelector";
import PageLoading from "./components/PageLoading";
import ThemeToggle from "./components/ThemeToggle";
import LoginPage from "./pages/LoginPage";
import "./index.css";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MeasurementsPage = lazy(() => import("./pages/MeasurementsPage"));
const HydrationPage = lazy(() => import("./pages/HydrationPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ProgressChartsPage = lazy(() => import("./pages/ProgressChartsPage"));
const AdminLandingPage = lazy(() => import("./pages/AdminLandingPage"));
const TranslationAdminPage = lazy(() => import("./pages/TranslationAdminPage"));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("authToken");
  return token ? children : <Navigate to="/" replace />;
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return <ProtectedRoute><Suspense fallback={<PageLoading />}>{children}</Suspense></ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeToggle />
      <LanguageSelector />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
        <Route path="/measurements" element={<ProtectedPage><MeasurementsPage /></ProtectedPage>} />
        <Route path="/hydration" element={<ProtectedPage><HydrationPage /></ProtectedPage>} />
        <Route path="/profile" element={<ProtectedPage><ProfilePage /></ProtectedPage>} />
        <Route path="/progress" element={<ProtectedPage><ProgressChartsPage /></ProtectedPage>} />
        <Route path="/admin" element={<ProtectedPage><AdminLandingPage /></ProtectedPage>} />
        <Route path="/admin/translations" element={<ProtectedPage><TranslationAdminPage /></ProtectedPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
