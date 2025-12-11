import { Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';

export const RootLayout = ({ children }: { children?: ReactNode }) => {
  return (
    <div className="app-shell">
      <AppHeader />
      <main>{children ?? <Outlet />}</main>
    </div>
  );
};
