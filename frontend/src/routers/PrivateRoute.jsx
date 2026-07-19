import { Navigate, Outlet } from "react-router-dom";
import Loader from "@/components/ui/Loader.jsx";
import { useSessionStatus } from "@/hooks/useSessionStatus.js";

/**
 * 인증된 사용자만 하위 라우트에 접근하도록 막는 레이아웃 가드.
 * 레이아웃 라우트로 배치되므로 하위 경로 간 이동 시 재마운트되지 않아
 * 세션 조회(useSessionStatus)가 진입당 1회로 유지된다.
 */
export default function PrivateRoute() {
  const status = useSessionStatus();

  if (status === "loading") {
    return <Loader visible message="세션 확인 중..." />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
