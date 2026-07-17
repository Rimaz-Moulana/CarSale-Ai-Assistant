import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import keycloak from './keycloak';

keycloak.init({ onLoad: 'login-required' }).then((authenticated) => {
  if (authenticated) {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } else {
    window.location.reload();
  }
}).catch((err) => {
  console.error("Keycloak initialization failed", err);
  document.getElementById('root')!.innerHTML = '<div style="padding: 20px; color: red;">Authentication Failed. Please ensure Keycloak is running.</div>';
});
