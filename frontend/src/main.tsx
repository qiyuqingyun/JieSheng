import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ProjectProvider } from "./contexts/ProjectContext";
import { KeyBindingsProvider } from "./contexts/KeyBindingsContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <KeyBindingsProvider>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </KeyBindingsProvider>
  </React.StrictMode>,
);
