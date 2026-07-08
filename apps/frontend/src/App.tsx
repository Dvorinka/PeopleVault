import * as React from "react";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { FullPageSpinner } from "@/components/common/LoadingSpinner";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard, GuestGuard } from "@/components/auth/AuthGuard";

// Route-level code splitting: each page is its own chunk.
const Login = React.lazy(() => import("@/pages/Login"));
const Register = React.lazy(() => import("@/pages/Register"));
const ForgotPassword = React.lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const VerifyEmail = React.lazy(() => import("@/pages/VerifyEmail"));
const Onboarding = React.lazy(() => import("@/pages/Onboarding"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const People = React.lazy(() => import("@/pages/People"));
const PersonDetail = React.lazy(() => import("@/pages/PersonDetail"));
const PersonEdit = React.lazy(() => import("@/pages/PersonEdit"));
const Events = React.lazy(() => import("@/pages/Events"));
const Reminders = React.lazy(() => import("@/pages/Reminders"));
const Tags = React.lazy(() => import("@/pages/Tags"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

const ProtectedLayout: React.FC = () => (
  <AuthGuard>
    <AppLayout />
  </AuthGuard>
);

const withSuspense = (node: React.ReactNode): React.ReactNode => (
  <React.Suspense fallback={<FullPageSpinner label="Loading…" />}>{node}</React.Suspense>
);

const router = createBrowserRouter([
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/", element: withSuspense(<Dashboard />) },
      { path: "/people", element: withSuspense(<People />) },
      { path: "/people/new", element: withSuspense(<PersonEdit />) },
      { path: "/people/:id", element: withSuspense(<PersonDetail />) },
      { path: "/people/:id/edit", element: withSuspense(<PersonEdit />) },
      { path: "/events", element: withSuspense(<Events />) },
      { path: "/reminders", element: withSuspense(<Reminders />) },
      { path: "/tags", element: withSuspense(<Tags />) },
      { path: "/settings", element: withSuspense(<Settings />) },
    ],
  },
  {
    path: "/onboarding",
    element: <AuthGuard>{withSuspense(<Onboarding />)}</AuthGuard>,
  },
  {
    path: "/login",
    element: <GuestGuard>{withSuspense(<Login />)}</GuestGuard>,
  },
  {
    path: "/register",
    element: <GuestGuard>{withSuspense(<Register />)}</GuestGuard>,
  },
  {
    path: "/forgot-password",
    element: <GuestGuard>{withSuspense(<ForgotPassword />)}</GuestGuard>,
  },
  { path: "/reset-password", element: withSuspense(<ResetPassword />) },
  { path: "/verify-email", element: withSuspense(<VerifyEmail />) },
  { path: "*", element: withSuspense(<NotFound />) },
]);

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <RouterProvider router={router} />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
