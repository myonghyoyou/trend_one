import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import Loader from "./components/ui/Loader.jsx";
import { useSessionStatus } from "./hooks/useSessionStatus.js";

function RootRedirect() {
  const status = useSessionStatus();

  if (status === "loading") {
    return <Loader visible message="세션 확인 중..." />;
  }

  return <Navigate to={status === "authenticated" ? "/dashboard" : "/login"} replace />;
}

function PrivateRoute() {
  const status = useSessionStatus();

  if (status === "loading") {
    return <Loader visible message="세션 확인 중..." />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  { path: "/login", element: <LoginPage /> },
  {
    element: <PrivateRoute />,
    children: [{ path: "/dashboard", element: <DashboardPage /> }],
  },
]);
