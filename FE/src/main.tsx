import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import keycloak from './keycloak';

keycloak.init({ 
  onLoad: 'check-sso', 
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
  pkceMethod: 'S256' 
}).then((authenticated) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App authenticated={authenticated} />
    </StrictMode>,
  );
}).catch((err) => {
  console.error("Keycloak initialization failed", err);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App authenticated={false} keycloakError={true} />
    </StrictMode>,
  );
});

