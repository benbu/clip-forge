import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.jsx';
import { installErrorReporter } from '@/lib/errorReporter';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

installErrorReporter();
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

