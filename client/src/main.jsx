import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import "@/styles/index.css";
import { StudentProvider } from "@/context/StudentContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StudentProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </StudentProvider>
  </StrictMode>
);
