/**
 * 백엔드(Spring Boot) 공통 fetch 래퍼.
 *
 * - 모든 요청에 credentials: 'include' 를 강제해 세션 쿠키를 동봉한다 (cross-origin 세션 쿠키 전략).
 * - 응답은 { resultCode, resultMsg, data } 형태의 ResponseDto를 공통으로 가정한다.
 * - resultCode 980(세션 만료)을 받으면 등록된 리스너(onSessionExpired)를 호출해
 *   앱 전역에서 로그인 페이지로 유도할 수 있게 한다.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/** @typedef {{ resultCode: number, resultMsg?: string, data?: unknown, errorList?: Array<object> }} ApiEnvelope */

export class ApiError extends Error {
  constructor(resultCode, resultMsg, data) {
    super(resultMsg || `API 요청이 실패했습니다. (resultCode: ${resultCode})`);
    this.name = "ApiError";
    this.resultCode = resultCode;
    this.resultMsg = resultMsg;
    this.data = data;
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
 * @returns {Promise<unknown>}
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

  if (json.resultCode === 980) {
    sessionExpiredListener?.();
  }

  if (json.resultCode !== 200) {
    throw new ApiError(json.resultCode, json.resultMsg, json.data ?? json.errorList);
  }

  return json.data;
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

/**
 * multipart 업로드 진행률을 전달하는 XHR 래퍼.
 * fetch는 요청 본문 업로드 진행률을 제공하지 않으므로 업로드 화면에서만 XHR을 사용한다.
 * @param {string} path
 * @param {FormData} formData
 * @param {(progress: number) => void} [onProgress]
 */
export function apiPostFormWithProgress(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      let json;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        reject(new ApiError(xhr.status, "서버 응답을 해석할 수 없습니다."));
        return;
      }

      if (json.resultCode === 980) {
        sessionExpiredListener?.();
      }
      if (json.resultCode !== 200) {
        reject(new ApiError(json.resultCode, json.resultMsg, json.data ?? json.errorList));
        return;
      }
      resolve(json.data);
    });

    xhr.addEventListener("error", () => reject(new Error("업로드 요청에 실패했습니다.")));
    xhr.addEventListener("abort", () => reject(new Error("업로드 요청이 취소되었습니다.")));
    xhr.send(formData);
  });
}
