import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { creerClientRequetes } from "./api/queries.ts";
import "./index.css";
import App from "./App.tsx";

const racine = document.getElementById("root");
if (!racine) throw new Error("Élément #root introuvable dans index.html");

const clientRequetes = creerClientRequetes();

createRoot(racine).render(
  <StrictMode>
    <QueryClientProvider client={clientRequetes}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
