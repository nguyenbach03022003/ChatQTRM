import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DesktopApp from "./DesktopApp";
import { isDesktop } from "./lib/desktop";
import "./index.css";

// In the Tauri native shell we render the full desktop IDE experience.
// In a plain browser (Docker/web mode) we keep the original web app.
const Root = isDesktop() ? DesktopApp : App;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
