import { apiGet, apiPost } from "@/api/client.js";

/**
 * 인증 관련 엔드포인트를 한곳에 모은 얇은 래퍼.
 * 응답 봉투를 변형하지 않고 그대로 반환한다 (소비 측에서 resCd/isLoggedIn 등을 직접 읽음).
 */

// ─────────────────────────────────────────────────────────────────────────────
// [DEV BYPASS] 백엔드 미구현 상태에서 admin/123으로 로그인을 통과시키는 임시 우회.
// 백엔드(Phase 2) 착수 시 이 블록과 각 함수의 우회 분기를 함께 삭제할 것.
// 프로덕션 빌드에서는 import.meta.env.DEV=false 라 우회 분기가 dead-code로 제거된다.
const DEV_AUTH_KEY = "dev-auth";
const DEV_BYPASS = import.meta.env.DEV;
const isDevAuthed = () => sessionStorage.getItem(DEV_AUTH_KEY) === "1";
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ loginId: string, password: string }} body
 * @returns {Promise<import("./client.js").ApiEnvelope>}
 */
export function login(body) {
  if (DEV_BYPASS && body.loginId === "admin" && body.password === "123") {
    sessionStorage.setItem(DEV_AUTH_KEY, "1");
    return Promise.resolve({ resCd: "0000" });
  }
  return apiPost("/api/auth/login", body);
}

/** @returns {Promise<import("./client.js").ApiEnvelope>} */
export function logout() {
  if (DEV_BYPASS && isDevAuthed()) {
    sessionStorage.removeItem(DEV_AUTH_KEY);
    return Promise.resolve({ resCd: "0000" });
  }
  return apiPost("/api/auth/logout", {});
}

/** @returns {Promise<import("./client.js").ApiEnvelope & { isLoggedIn?: boolean }>} */
export function getSession() {
  if (DEV_BYPASS && isDevAuthed()) {
    return Promise.resolve({ resCd: "0000", isLoggedIn: true });
  }
  return apiGet("/api/auth/session");
}
