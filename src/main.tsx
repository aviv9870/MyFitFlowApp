import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initMode } from "./lib/theme";
import { startVersionCheck } from "./lib/versionCheck";
import "./index.css";

initMode();
startVersionCheck();
createRoot(document.getElementById("root")!).render(<App />);
