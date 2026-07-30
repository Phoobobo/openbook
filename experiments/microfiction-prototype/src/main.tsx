import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter：静态托管（GitHub Pages）无法做 SPA 路由回退，用 hash 免服务端配置
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
