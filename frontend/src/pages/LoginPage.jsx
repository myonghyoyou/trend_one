import { Navigate } from "react-router-dom";
import LoginForm from "../components/auth/LoginForm.jsx";
import Loader from "../components/ui/Loader.jsx";
import { useSessionStatus } from "../hooks/useSessionStatus.js";

export default function LoginPage() {
  const status = useSessionStatus();

  if (status === "loading") {
    return <Loader visible message="세션 확인 중..." />;
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-lg font-semibold text-slate-900">정압기 관리 시스템</h1>
        <LoginForm />
      </div>
    </div>
  );
}
