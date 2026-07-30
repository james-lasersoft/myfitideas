import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import type { ReactNode } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MeasurementsPage from "./pages/MeasurementsPage";
import HydrationPage from "./pages/HydrationPage";
import ProfilePage from "./pages/ProfilePage";
import ProgressChartsPage from "./pages/ProgressChartsPage";
import "./index.css";

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const token = localStorage.getItem("authToken");

  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/measurements" 
          element={
            <ProtectedRoute>
              <MeasurementsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hydration"
          element={
            <ProtectedRoute>
              <HydrationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <ProgressChartsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
