import { Link, useRouterState } from '@tanstack/react-router';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/energy', label: 'Energy Live' },
  { to: '/entities', label: 'Entidades' },
];

export const AppHeader = () => {
  const { location } = useRouterState();

  return (
    <header className="app-header">
      <h1>HA Dash</h1>
      <nav>
        <ul>
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <li key={link.to}>
                <Link to={link.to} className={isActive ? 'active' : undefined}>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
};
