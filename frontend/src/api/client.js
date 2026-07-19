/**
 * 백엔드(Spring Boot) 공통 fetch 래퍼.
 *
 * - 모든 요청에 credentials: 'include' 를 강제해 세션 쿠키를 동봉한다 (cross-origin 세션 쿠키 전략).
 * - 응답은 { resCd, resMsg, ...data } 형태를 공통으로 가정한다 (docs/plan.md 섹션 6).
 * - resCd "0002"(세션 만료)를 받으면 등록된 리스너(onSessionExpired)를 호출해
 *   앱 전역에서 로그인 페이지로 유도할 수 있게 한다.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/** @typedef {{ resCd: string, resMsg?: string, [key: string]: unknown }} ApiEnvelope */

export class ApiError extends Error {
  constructor(resCd, resMsg) {
    super(resMsg || `API 요청이 실패했습니다. (resCd: ${resCd})`);
    this.name = "ApiError";
    this.resCd = resCd;
  }
}

/**
 * ApiError면 서버 메시지를, 아니면 fallback을 반환한다.
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
export function resolveErrorMessage(error, fallback) {
  return error instanceof ApiError ? error.message : fallback;
}

let sessionExpiredListener = null;

/** @param {() => void} listener */
export function setOnSessionExpired(listener) {
  sessionExpiredListener = listener;
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<ApiEnvelope>}
 */
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  /** @type {ApiEnvelope} */
  const json = await response.json();

  if (json.resCd === "0002") {
    sessionExpiredListener?.();
  }

  if (json.resCd !== "0000") {
    throw new ApiError(json.resCd, json.resMsg);
  }

  return json;
}

/** @param {string} path */
export function apiGet(path) {
  return request(path, { method: "GET" });
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
export function apiPost(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

/**
 * @param {string} path
 * @param {FormData} formData
 */
export function apiPostForm(path, formData) {
  return request(path, { method: "POST", body: formData });
}
