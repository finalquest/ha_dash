import { Link, useRouterState } from '@tanstack/react-router';

interface AppHeaderProps {
  collapsed?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: string;
  description: string;
  match?: (pathname: string) => boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    items: [
      {
        to: '/dashboard/favorites',
        label: 'Favoritos',
        icon: '★',
        description: 'Accesos rápidos a escenas y entidades',
        match: (pathname) => pathname === '/' || pathname.startsWith('/dashboard/favorites'),
      },
      {
        to: '/dashboard/energy',
        label: 'Energía',
        icon: '⚡',
        description: 'Panel de consumo y métricas históricas',
        match: (pathname) => pathname.startsWith('/dashboard/energy'),
      },
      {
        to: '/dashboard/switches',
        label: 'Switches',
        icon: '🔌',
        description: 'Resumen agrupado por área',
        match: (pathname) => pathname.startsWith('/dashboard/switches'),
      },
    ],
  },
  {
    id: 'live',
    title: 'Live',
    items: [
      {
        to: '/live/all',
        label: 'All',
        icon: '📡',
        description: 'Clima, fans y HVAC en vivo',
        match: (pathname) => pathname.startsWith('/live/all') || pathname.startsWith('/climate'),
      },
      {
        to: '/live/energy',
        label: 'Energía',
        icon: '⚡',
        description: 'Monitoreo instantáneo de consumo',
        match: (pathname) => pathname.startsWith('/live/energy') || pathname === '/energy',
      },
      {
        to: '/live/lights',
        label: 'Luces',
        icon: '💡',
        description: 'Control táctil optimizado para dimerización',
        match: (pathname) => pathname.startsWith('/live/lights') || pathname === '/lights',
      },
      {
        to: '/live/switches',
        label: 'Switches',
        icon: '🔘',
        description: 'Actuadores y tomas inteligentes',
        match: (pathname) => pathname.startsWith('/live/switches') || pathname === '/switches',
      },
    ],
  },
];

const isItemActive = (item: NavItem, pathname: string) => {
  if (item.match) {
    return item.match(pathname);
  }
  if (item.to === '/') {
    return pathname === '/';
  }
  return pathname.startsWith(item.to);
};

export const AppHeader = ({ collapsed }: AppHeaderProps) => {
  const { location } = useRouterState();

  return (
    <aside className={`app-sidebar${collapsed ? ' app-sidebar--collapsed' : ''}`} aria-hidden={collapsed}>
      <div className="app-sidebar__brand">
        <span className="app-sidebar__logo">HA</span>
        <p>Dash</p>
      </div>
      {NAV_SECTIONS.map((section) => (
        <section key={section.id} className="nav-section">
          <p className="nav-section__title">{section.title}</p>
          <div className="nav-section__grid">
            {section.items.map((item) => {
              const active = isItemActive(item, location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-card${active ? ' nav-card--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="nav-card__icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span>
                    <span className="nav-card__label">{item.label}</span>
                    <span className="nav-card__description">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </aside>
  );
};
