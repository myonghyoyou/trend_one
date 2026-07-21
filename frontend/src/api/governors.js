import { apiGet, apiPost, apiPostFormWithProgress } from "@/api/client.js";

/**
 * @param {{ startDate: string, endDate: string, srchCity?: string, inspctDay?: string, srchCntnt?: string }} params
 * @returns {Promise<{ gvrnrList: Array<object> }>}
 */
export function searchGovernors(params) {
  return apiPost("/api/governors/list", params);
}

/**
 * @param {{
 *   gvrnrUids: string,
 *   gvrnrNms: string,
 *   startDate: string,
 *   endDate: string,
 *   intervalNum: string,
 * }} params
 * @returns {Promise<{ xAxisList: string[], statDataObj: Record<string, object> }>}
 */
export function fetchGovernorStats(params) {
  return apiPost("/api/governors/stats", params);
}

/**
 * @param {FormData} formData - `upload_files` 필드로 엑셀 파일 포함
 */
export function uploadGovernorExcel(formData, onProgress) {
  return apiPostFormWithProgress("/api/crud", formData, onProgress);
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
