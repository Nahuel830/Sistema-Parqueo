import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './styles.css';

const ruta = window.location.pathname.replace(/\/$/, '');
const pantalla = ruta === '/admin' ? <AdminApp /> : ruta === '/encargado' ? <AdminApp rol="ENCARGADO" /> : <App />;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {pantalla}
  </StrictMode>,
);
