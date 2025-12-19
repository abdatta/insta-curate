import { render } from 'preact';
import { App } from './app';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';
import { api } from './services/api';

const updateSW = registerSW({ immediate: true });

// Periodic update check (respecting "Do Not Interrupt" logic)
setInterval(async () => {
    // 1. Client-side busy check (e.g. commenting)
    if (window.instaCurateBusy) {
        console.debug('[PWA] Client is busy, skipping update check');
        return;
    }

    // 2. Server-side busy check (Curator running)
    try {
        const progress = await api.getProgress();
        if (progress.status === 'running') {
            console.debug('[PWA] Server is busy (curation running), skipping update check');
            return;
        }
    } catch (e) {
        console.warn('[PWA] Failed to check server status, skipping update check');
        return;
    }

    // 3. Safe to update - this will reload the page if a new SW is waiting
    updateSW(true);
}, 60 * 1000); // Check every minute

render(<App />, document.getElementById('app') as HTMLElement);
