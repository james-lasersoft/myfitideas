import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthorizationProvider } from "./auth/AuthorizationContext";
import PermissionRoute from "./auth/PermissionRoute";
import SuperAdminRoute from "./auth/SuperAdminRoute";
import TranslationAdminShell from "./components/admin/TranslationAdminShell";
import GlobalControls from "./components/layout/GlobalControls";
import PageLoading from "./components/PageLoading";
import LoginPage from "./pages/LoginPage";
import "./components/ui/Button.css";
import "./pages/Admin.css";
import "./pages/AdminConsoleTheme.css";
import "./pages/AdminLegacyShell.css";
import "./pages/ProfileLocalizationPolish.css";
import "./index.css";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MeasurementsPage = lazy(() => import("./pages/MeasurementsPage"));
const HydrationPage = lazy(() => import("./pages/HydrationPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ProfileSecurityPage = lazy(() => import("./pages/ProfileSecurityPage"));
const ProgressChartsPage = lazy(() => import("./pages/ProgressChartsPage"));
const AdminLandingPage = lazy(() => import("./pages/AdminLandingPage"));
const AdminSecurityPage = lazy(() => import("./pages/AdminSecurityPage"));
const CompanySettingsPage = lazy(() => import("./pages/CompanySettingsPage"));
const TranslationAdminPage = lazy(() => import("./pages/TranslationAdminPage"));
const UserAdminPage = lazy(() => import("./pages/UserAdminPage"));
const RoleAdminPage = lazy(() => import("./pages/RoleAdminPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const AcceptInvitationPage = lazy(() => import("./pages/AcceptInvitationPage"));
const RegistrationPage = lazy(() => import("./pages/RegistrationPage"));
const WorkspaceChooserPage = lazy(() => import("./pages/WorkspaceChooserPage"));
const SystemOperationsPage = lazy(() => import("./pages/SystemOperationsPage"));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("authToken");
  return token ? children : <Navigate to="/" replace />;
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return <ProtectedRoute><Suspense fallback={<PageLoading />}>{children}</Suspense></ProtectedRoute>;
}

function AuthorizedPage({ permission, children }: { permission: string; children: ReactNode }) {
  return <ProtectedPage><PermissionRoute permission={permission}>{children}</PermissionRoute></ProtectedPage>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthorizationProvider>
        <GlobalControls />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<Suspense fallback={<PageLoading />}><RegistrationPage /></Suspense>} />
          <Route path="/accept-invitation" element={<Suspense fallback={<PageLoading />}><AcceptInvitationPage /></Suspense>} />
          <Route path="/workspace" element={<ProtectedPage><WorkspaceChooserPage /></ProtectedPage>} />
          <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
          <Route path="/measurements" element={<ProtectedPage><MeasurementsPage /></ProtectedPage>} />
          <Route path="/hydration" element={<ProtectedPage><HydrationPage /></ProtectedPage>} />
          <Route path="/profile" element={<ProtectedPage><ProfilePage /></ProtectedPage>} />
          <Route path="/profile/security" element={<ProtectedPage><ProfileSecurityPage /></ProtectedPage>} />
          <Route path="/progress" element={<ProtectedPage><ProgressChartsPage /></ProtectedPage>} />
          <Route path="/admin" element={<AuthorizedPage permission="admin.access"><AdminLandingPage /></AuthorizedPage>} />
          <Route path="/admin/security" element={<AuthorizedPage permission="system.operations"><AdminSecurityPage /></AuthorizedPage>} />
          <Route path="/admin/settings" element={<AuthorizedPage permission="system.operations"><CompanySettingsPage /></AuthorizedPage>} />
          <Route path="/admin/translations" element={<AuthorizedPage permission="translations.read"><TranslationAdminShell><TranslationAdminPage /></TranslationAdminShell></AuthorizedPage>} />
          <Route path="/admin/users" element={<AuthorizedPage permission="users.read"><UserAdminPage /></AuthorizedPage>} />
          <Route path="/admin/roles" element={<AuthorizedPage permission="roles.read"><RoleAdminPage /></AuthorizedPage>} />
          <Route path="/admin/audit" element={<AuthorizedPage permission="audit.read"><AuditLogPage /></AuthorizedPage>} />
          <Route path="/system-operations" element={<ProtectedPage><SuperAdminRoute><SystemOperationsPage /></SuperAdminRoute></ProtectedPage>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthorizationProvider>
    </BrowserRouter>
  );
}
