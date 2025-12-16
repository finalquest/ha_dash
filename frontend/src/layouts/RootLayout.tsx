import { Outlet } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';
import { useEventStream } from '../hooks/useEventStream';

export const RootLayout = ({ children }: { children?: ReactNode }) => {
  useEventStream();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-shell${sidebarOpen ? ' app-shell--sidebar-open' : ' app-shell--sidebar-collapsed'}`}>
      <AppHeader collapsed={!sidebarOpen} />
      <main className="app-main">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
        >
          ☰
        </button>
        {children ?? <Outlet />}
      </main>
    </div>
  );
};
