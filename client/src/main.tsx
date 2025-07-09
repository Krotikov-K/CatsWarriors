import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import WebApp from '@twa-dev/sdk';

// Initialize Telegram Web App only if available
try {
  if (WebApp && WebApp.initDataUnsafe?.user) {
    WebApp.ready();
    WebApp.expand();
    WebApp.enableClosingConfirmation();
  }
} catch (error) {
  console.log('Telegram Web App not available, running in browser mode');
}

// Apply dark theme by default for better readability
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
