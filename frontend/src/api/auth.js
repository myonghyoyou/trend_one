import { apiGet, apiPost } from "@/api/client.js";

/**
 * 인증 관련 엔드포인트를 한곳에 모은 얇은 래퍼.
 * client.js가 ResponseDto의 data를 반환하므로 인증 상태 데이터만 소비 측에 전달한다.
 */

/**
 * @param {{ loginId: string, password: string }} body
 * @returns {Promise<unknown>}
 */
export function login(body) {
  return apiPost("/api/auth/login", body);
}

/** @returns {Promise<unknown>} */
export function logout() {
  return apiPost("/api/auth/logout", {});
}

/** @returns {Promise<{ isLoggedIn?: boolean } | undefined>} */
export function getSession() {
  return apiGet("/api/auth/session");
}
