import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Step 3: Anti-white-screen error listener
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML.trim() === '') {
    root.innerHTML = `<div style="padding: 24px; color: red; font-family: sans-serif;"><h3>Application Runtime Error:</h3><pre>${event.message}</pre></div>`;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML.trim() === '') {
    root.innerHTML = `<div style="padding: 24px; color: red; font-family: sans-serif;"><h3>Promise Rejection Error:</h3><pre>${event.reason?.message || event.reason}</pre></div>`;
  }
});

createRoot(document.getElementById('root')!).render(<App />);
