import { createContext, useCallback, useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";
import AlertModal from "../components/ui/AlertModal.jsx";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";

const ModalContext = createContext(null);

const INITIAL_ALERT_STATE = { open: false, message: "", succYn: "SUCCESS", callback: null };
const INITIAL_CONFIRM_STATE = { open: false, message: "", onOk: null };

export function ModalProvider({ children }) {
  const [alertState, setAlertState] = useState(INITIAL_ALERT_STATE);
  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);

  /** @param {string} message @param {"SUCCESS"|"FAIL"} [succYn] @param {() => void} [callback] */
  const openAlert = useCallback((message, succYn = "SUCCESS", callback = null) => {
    setAlertState({ open: true, message, succYn, callback });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => {
      prev.callback?.();
      return INITIAL_ALERT_STATE;
    });
  }, []);

  /** @param {string} message @param {() => void} onOk */
  const openConfirm = useCallback((message, onOk) => {
    setConfirmState({ open: true, message, onOk });
  }, []);

  const closeConfirm = useCallback(() => setConfirmState(INITIAL_CONFIRM_STATE), []);

  const handleConfirmOk = useCallback(() => {
    confirmState.onOk?.();
    closeConfirm();
  }, [confirmState, closeConfirm]);

  const value = useMemo(() => ({ openAlert, openConfirm }), [openAlert, openConfirm]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      <AlertModal
        open={alertState.open}
        message={alertState.message}
        succYn={alertState.succYn}
        onClose={closeAlert}
      />
      <ConfirmModal
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={handleConfirmOk}
        onCancel={closeConfirm}
      />
    </ModalContext.Provider>
  );
}

ModalProvider.propTypes = {
  children: PropTypes.node,
};

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal은 ModalProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
