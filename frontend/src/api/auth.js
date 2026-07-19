import { apiGet, apiPost } from "./client.js";

/**
 * 인증 관련 엔드포인트를 한곳에 모은 얇은 래퍼.
 * 응답 봉투를 변형하지 않고 그대로 반환한다 (소비 측에서 resCd/isLoggedIn 등을 직접 읽음).
 */

/**
 * @param {{ loginId: string, password: string }} body
 * @returns {Promise<import("./client.js").ApiEnvelope>}
 */
export function login(body) {
  return apiPost("/api/auth/login", body);
}

/** @returns {Promise<import("./client.js").ApiEnvelope>} */
export function logout() {
  return apiPost("/api/auth/logout", {});
}

/** @returns {Promise<import("./client.js").ApiEnvelope & { isLoggedIn?: boolean }>} */
export function getSession() {
  return apiGet("/api/auth/session");
}
