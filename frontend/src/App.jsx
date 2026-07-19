import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routers/routes.jsx";
import { ModalProvider } from "./contexts/ModalContext.jsx";
import { setOnSessionExpired } from "./utils/apiClient.js";

export default function App() {
  useEffect(() => {
    setOnSessionExpired(() => {
      if (router.state.location.pathname !== "/login") {
        router.navigate("/login");
      }
    });
  }, []);

  return (
    <ModalProvider>
      <RouterProvider router={router} />
    </ModalProvider>
  );
}
