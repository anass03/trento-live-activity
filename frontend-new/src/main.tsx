import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./lib/i18n";
import "./styles/globals.css";
import "./styles/events-redesign.css";
import "./styles/activity-redesign.css";
import "./styles/settings-redesign.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
