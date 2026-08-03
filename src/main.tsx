import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initMode } from "./lib/theme";
import "./index.css";

initMode();
createRoot(document.getElementById("root")!).render(<App />);
