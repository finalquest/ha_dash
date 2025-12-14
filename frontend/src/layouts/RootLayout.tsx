import { Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';
import { useEventStream } from '../hooks/useEventStream';

export const RootLayout = ({ children }: { children?: ReactNode }) => {
  useEventStream();
  return (
    <div className="app-shell">
      <AppHeader />
      <main>{children ?? <Outlet />}</main>
    </div>
  );
};
