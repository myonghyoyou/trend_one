import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import { ModalProvider } from "./context/ModalContext.jsx";
import { setOnSessionExpired } from "./lib/apiClient.js";

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
