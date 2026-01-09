
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Eliminamos StrictMode para asegurar que el Power-Up se inicialice una sola vez y de forma limpia
root.render(
  <App />
);
