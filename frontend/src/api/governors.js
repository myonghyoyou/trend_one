import { apiGet, apiPost, apiPostFormWithProgress } from "@/api/client.js";

/**
 * @param {{ startDate: string, endDate: string, srchCity?: string, inspctDay?: string, srchCntnt?: string }} params
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ gvrnrList: Array<object> }>}
 */
export function searchGovernors(params, signal) {
  return apiPost("/api/governors/list", params, { signal });
}

/**
 * @param {{
 *   gvrnrUids: string,
 *   gvrnrNms: string,
 *   startDate: string,
 *   endDate: string,
 *   intervalNum: string,
 * }} params
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ xAxisList: string[], statDataObj: Record<string, object> }>}
 */
export function fetchGovernorStats(params, signal) {
  return apiPost("/api/governors/stats", params, { signal });
}

/**
 * 인쇄용 전체 정압기 통계를 조회한다. 기존 화면 통계 API의 3개 선택 제한과 분리된다.
 * @param {{ gvrnrUids: string, startDate: string, endDate: string, intervalNum: string }} params
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ xAxisList: string[], statDataObj: Record<string, object> }>}
 */
export function fetchPrintGovernorStats(params, signal) {
  return apiPost("/api/governors/print-stats", params, { signal });
}

/**
 * @param {FormData} formData - `upload_files` 필드로 엑셀 파일 포함
 */
export function uploadGovernorExcel(formData, onProgress) {
  return apiPostFormWithProgress("/api/crud", formData, onProgress);
}

/**
 * @param {FormData} formData - `upload_files` 필드로 엑셀 파일 포함
 * @returns {Promise<{
 *   fileName: string,
 *   fileSize: number,
 *   fileSha256: string,
 *   impact: object,
 * }>}
 */
export function previewGovernorExcel(formData) {
  return apiPostFormWithProgress("/api/crud/preview", formData);
}

/**
 * @param {string} transactionId
 * @returns {Promise<{
 *   transaction_id: string,
 *   status: string,
 *   progress_percent: number,
 *   progress_message?: string,
 * }>}
 */
export function fetchUploadStatus(transactionId) {
  return apiGet(`/api/transactions/${encodeURIComponent(transactionId)}`);
}
