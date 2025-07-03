import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import WebApp from '@twa-dev/sdk';

// Initialize Telegram Web App
if (WebApp.initDataUnsafe?.user) {
  WebApp.ready();
  WebApp.expand();
  WebApp.enableClosingConfirmation();
}

// Apply dark theme by default for better readability
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
