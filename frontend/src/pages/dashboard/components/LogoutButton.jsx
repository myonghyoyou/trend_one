import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button.jsx";
import { logout } from "../../../api/auth.js";

export default function LogoutButton() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <Button variant="secondary" onClick={handleLogout} disabled={loggingOut}>
      로그아웃
    </Button>
  );
}
