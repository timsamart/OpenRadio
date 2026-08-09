import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './styles.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);

// Service worker registration happens after the app is interactive and never
// blocks it. Live audio is not routed through the worker (PRD §42).
//
// registerType: 'autoUpdate' (vite.config.ts) means a new build takes over
// silently on the next visit — no "reload to update" prompt. But this app is
// a radio: listeners leave the tab open for hours, so "next visit" may not
// come for days. Poll for a fresh service worker periodically so a long-lived
// tab still picks up updates without the listener ever noticing.
const updateSW = registerSW({ immediate: false });
window.setInterval(() => void updateSW(), 60 * 60 * 1000);
