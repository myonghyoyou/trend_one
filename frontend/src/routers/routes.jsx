import { Navigate, createBrowserRouter } from "react-router-dom";
import PrivateRoute from "./PrivateRoute.jsx";
import PublicRoute from "./PublicRoute.jsx";
import LoginPage from "../pages/auth/LoginPage.jsx";
import DashboardPage from "../pages/dashboard/DashboardPage.jsx";

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <PrivateRoute />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <DashboardPage /> },
    ],
  },
]);
