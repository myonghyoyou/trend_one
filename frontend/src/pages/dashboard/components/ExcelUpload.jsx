import { useRef, useState } from "react";
import PropTypes from "prop-types";
import Button from "@/components/ui/Button.jsx";
import Loader from "@/components/ui/Loader.jsx";
import UploadPreviewModal from "@/pages/dashboard/components/UploadPreviewModal.jsx";
import { useModal } from "@/contexts/ModalContext.jsx";
import { fetchUploadStatus, previewGovernorExcel, uploadGovernorExcel } from "@/api/governors.js";
import { ApiError, resolveErrorMessage } from "@/api/client.js";

const STATUS_POLL_INTERVAL_MS = 1000;
const MAX_STATUS_POLL_COUNT = 1800;

function waitForNextPoll() {
  return new Promise((resolve) => setTimeout(resolve, STATUS_POLL_INTERVAL_MS));
}

async function waitForUploadCompletion(transactionId, onStatus) {
  for (let pollCount = 0; pollCount < MAX_STATUS_POLL_COUNT; pollCount += 1) {
    const status = await fetchUploadStatus(transactionId);
    onStatus(status);

    if (status.status === "completed") return status;
    if (status.status === "failed") {
      throw new ApiError(-1, status.progress_message || "업로드 처리에 실패했습니다.");
    }
    await waitForNextPoll();
  }

  throw new ApiError(-1, "업로드 처리 시간이 초과되었습니다.");
}

export default function ExcelUpload({ onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("파일 업로드 중...");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [allowDeleteOnly, setAllowDeleteOnly] = useState(false);
  const { openAlert } = useModal();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("upload_files", file);

    setSelectedFile(file);
    setAllowDeleteOnly(false);
    setPreviewing(true);
    setUploadMessage("파일 내용을 분석하고 있습니다...");
    try {
      const previewResponse = await previewGovernorExcel(formData);
      setPreview(previewResponse);
    } catch (error) {
      const message = resolveErrorMessage(error, "업로드 중 오류가 발생했습니다.");
      openAlert(message, "FAIL");
    } finally {
      setPreviewing(false);
      setUploadMessage("파일 업로드 중...");
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setSelectedFile(null);
    setAllowDeleteOnly(false);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !preview) return;
    const formData = new FormData();
    formData.append("upload_files", selectedFile);
    formData.append("preview_sha256", preview.fileSha256);
    formData.append("preview_fingerprint", preview.impact?.databaseFingerprint ?? "");
    formData.append("allow_delete_only", String(allowDeleteOnly));

    setPreview(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadMessage("파일 전송 중...");
    try {
      const uploadResponse = await uploadGovernorExcel(formData, (progress) => {
        setUploadProgress(progress);
      });
      setUploadMessage("서버에서 업로드 데이터를 처리하고 있습니다...");
      setUploadProgress(0);
      await waitForUploadCompletion(uploadResponse.transaction_id, (status) => {
        setUploadProgress(status.progress_percent ?? 0);
        if (status.progress_message) setUploadMessage(status.progress_message);
      });
      setUploadProgress(100);
      openAlert("업로드가 완료되었습니다.", "SUCCESS", onUploaded);
    } catch (error) {
      const message = resolveErrorMessage(error, "업로드 중 오류가 발생했습니다.");
      openAlert(message, "FAIL");
    } finally {
      setSelectedFile(null);
      setAllowDeleteOnly(false);
      setUploading(false);
      setUploadProgress(0);
      setUploadMessage("파일 업로드 중...");
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading || previewing}>
        엑셀 업로드
      </Button>
      <Loader visible={uploading || previewing} message={uploadMessage} progress={uploading ? uploadProgress : undefined} />
      {preview && (
        <UploadPreviewModal
          preview={preview}
          allowDeleteOnly={allowDeleteOnly}
          onAllowDeleteOnlyChange={setAllowDeleteOnly}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancelPreview}
        />
      )}
    </>
  );
}

ExcelUpload.propTypes = {
  onUploaded: PropTypes.func,
};
