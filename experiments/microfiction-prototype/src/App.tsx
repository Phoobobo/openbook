import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import CreatorPage from './pages/CreatorPage';
import ReaderPage from './pages/ReaderPage';

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="font-medium tracking-wide text-white">OpenBook</span>
          <span className="text-xs text-white/50">微小说原型 v0.1</span>
        </div>
        <nav className="flex gap-1 text-sm">
          <NavLink
            to="/creator"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-full transition ${
                isActive ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`
            }
          >
            创作
          </NavLink>
          <NavLink
            to="/reader"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-full transition ${
                isActive ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`
            }
          >
            阅读
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 min-h-0">
        <Routes>
          <Route path="/" element={<Navigate to="/creator" replace />} />
          <Route path="/creator" element={<CreatorPage />} />
          <Route path="/reader" element={<ReaderPage />} />
          <Route path="/reader/:storyId" element={<ReaderPage />} />
        </Routes>
      </main>
    </div>
  );
}
