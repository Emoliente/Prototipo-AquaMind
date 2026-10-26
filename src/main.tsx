import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/index.css';
import { App } from './app/App';
import { LimiteError } from './components/layout/LimiteError';
import { useTelemetria } from './store/useTelemetria';

// Promesas que fallan sin que nadie las atienda: se registran y se avisa (como mucho cada 10 s).
let ultimoAviso = 0;
window.addEventListener('unhandledrejection', (e) => {
  console.error('[AquaMind] error sin atender', e.reason);
  if (Date.now() - ultimoAviso < 10_000) return;
  ultimoAviso = Date.now();
  useTelemetria.getState().avisar({ ok: false, mensaje: 'Algo no terminó como se esperaba. Si una acción no se aplicó, vuelve a intentarla.' });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LimiteError variante="global">
      <App />
    </LimiteError>
  </StrictMode>,
);
