import React from 'react';
import ReactDOM from 'react-dom/client';
// Be Vietnam Pro, bundled with the app (same font and weights as the mobile app); the browser downloads only the subsets a page needs
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import '@/lib/i18n';
import App from '@/app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
