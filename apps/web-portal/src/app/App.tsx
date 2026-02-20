import { Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { PERMISSIONS } from "@britium/shared";

import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { ROUTES } from "@/routes/routeRegistry";

// Public
import Home from "@/features/public/tracking/Home";
import Calculator from "@/features/public/rate-calculator/Calculator";
import MapPage from "@/features/fleet/live-map/Map";

// Identity
import Login from "@/features/identity/auth/Login";
import ForgotPassword from "@/features/identity/auth/ForgotPassword";
import SignUpCustomer from "@/features/identity/signup/SignUpCustomer";
import SignUpMerchant from "@/features/identity/signup/SignUpMerchant";
import KYC from "@/features/identity/kyc/KYC";
import ForcePasswordReset from "@/features/identity/session/ForcePasswordReset";
import Unauthorized from "@/features/identity/session/Unauthorized";

// Analytics
import Dashboard from "@/features/analytics/dashboards/Dashboard";

// Operations
import PickupRequest from "@/features/operations/shipments/PickupRequest";

// Control Room
import ControlRoom from "@/features/control-room/rbac/ControlRoom";

function NotFound() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-muted-foreground mt-2">Page not found.</p>
    </div>
  );
}

const RESERVED_PATHS = new Set<string>([
  "/",
  "/calculator",
  "/map",
  "/login",
  "/forgot-password",
  "/signup/customer",
  "/signup/merchant",
  "/unauthorized",
  "/kyc",
  "/force-password-reset",
  "/dashboard",
  "/pickup-request",
  "/control-room",
]);

export default function App() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-6">Loading…</div>}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/map" element={<MapPage />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup/customer" element={<SignUpCustomer />} />
          <Route path="/signup/merchant" element={<SignUpMerchant />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Requires auth; password change NOT enforced */}
          <Route
            path="/kyc"
            element={
              <ProtectedRoute requireAuth={true} requirePasswordOk={false}>
                <KYC />
              </ProtectedRoute>
            }
          />
          <Route
            path="/force-password-reset"
            element={
              <ProtectedRoute requireAuth={true} requirePasswordOk={false}>
                <ForcePasswordReset />
              </ProtectedRoute>
            }
          />

          {/* Internal: Analytics */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Internal: Operations */}
          <Route
            path="/pickup-request"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.OPS_SHIPMENT_CREATE_S3_BRANCH]}>
                <PickupRequest />
              </ProtectedRoute>
            }
          />

          {/* Control Room (APP_OWNER only via permissions) */}
          <Route
            path="/control-room"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.CTRL_RBAC_VIEW_S5_COMPANY]}>
                <ControlRoom />
              </ProtectedRoute>
            }
          />

          {/* Auto-registered module routes (pages/*) */}
          {ROUTES.filter((r) => !RESERVED_PATHS.has(r.path)).map((r) => {
            const C = r.element;
            const element = r.requireAuth ? (
              <ProtectedRoute requiredPermissions={r.requiredPermissions ?? []} permissionMode="any">
                <C />
              </ProtectedRoute>
            ) : (
              <C />
            );

            return <Route key={r.path} path={r.path} element={element} />;
          })}

          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
