import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './styles.css';

const Pantalla = /^\/admin\/?$/.test(window.location.pathname) ? AdminApp : App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Pantalla />
  </StrictMode>,
);
