import { useRef, useState } from "react";
import PropTypes from "prop-types";
import Button from "../../../components/ui/Button.jsx";
import Loader from "../../../components/ui/Loader.jsx";
import { useModal } from "../../../contexts/ModalContext.jsx";
import { uploadGovernorExcel } from "../../../hooks/api/useGovernorApi.js";
import { ApiError } from "../../../utils/apiClient.js";

export default function ExcelUpload({ onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { openAlert } = useModal();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("upload_files", file);

    setUploading(true);
    try {
      await uploadGovernorExcel(formData);
      openAlert("업로드가 완료되었습니다.", "SUCCESS", onUploaded);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "업로드 중 오류가 발생했습니다.";
      openAlert(message, "FAIL");
    } finally {
      setUploading(false);
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
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        엑셀 업로드
      </Button>
      <Loader visible={uploading} message="파일 업로드 중..." />
    </>
  );
}

ExcelUpload.propTypes = {
  onUploaded: PropTypes.func,
};
