import { useEffect, useState } from "react";
import { getSession } from "@/api/auth.js";

/**
 * GET /api/auth/session 을 호출해 현재 세션 유효성을 확인한다.
 * SPA는 서버 미들웨어가 없으므로, 라우팅 가드가 필요한 곳마다 이 훅으로 클라이언트에서 직접 확인해야 한다
 * (docs/plan.md 섹션 5 참고).
 *
 * @returns {"loading" | "authenticated" | "unauthenticated"}
 */
export function useSessionStatus() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((res) => {
        if (!cancelled) setStatus(res.isLoggedIn ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
