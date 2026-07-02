import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/header.css';
import './styles/cards.css';
import './styles/tables.css';
import './styles/badges.css';
import './styles/forms.css';
import './styles/charts.css';
import './styles/pages.css';
import './styles/terminal-theme.css';
import './styles/animations.css';
import './styles/responsive.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
