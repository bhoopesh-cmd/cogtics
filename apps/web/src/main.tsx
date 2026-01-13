import React from 'react';
import ReactDOM from 'react-dom/client';
import { Providers } from './app/providers';
import { AppRouter } from './app/router';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </React.StrictMode>
);

