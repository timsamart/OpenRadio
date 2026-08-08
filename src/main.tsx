import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './styles.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);

// Service worker registration happens after the app is interactive and never
// blocks it. Live audio is not routed through the worker (PRD §42).
registerSW({ immediate: false });
