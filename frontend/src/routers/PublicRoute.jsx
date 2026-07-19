import { Navigate, Outlet } from "react-router-dom";
import Loader from "@/components/ui/Loader.jsx";
import { useSessionStatus } from "@/hooks/useSessionStatus.js";

/**
 * 비로그인 전용 라우트(로그인 등) 가드.
 * 이미 인증된 사용자가 접근하면 대시보드로 돌려보낸다.
 */
export default function PublicRoute() {
  const status = useSessionStatus();

  if (status === "loading") {
    return <Loader visible message="세션 확인 중..." />;
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
