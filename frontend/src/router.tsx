import {
  Router,
  RouterProvider,
  Route,
  RootRoute,
} from '@tanstack/react-router';
import { RootLayout } from './layouts/RootLayout';
import { DashboardView } from './screens/DashboardView';
import { EntitiesView } from './screens/EntitiesView';
import { EnergyDashboardView } from './screens/EnergyDashboardView';
import { LightsDashboardView } from './screens/LightsDashboardView';
import { SwitchesDashboardView } from './screens/SwitchesDashboardView';

const rootRoute = new RootRoute({
  component: RootLayout,
});

const dashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardView,
});

const entitiesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'entities',
  component: EntitiesView,
});

const energyRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'energy',
  component: EnergyDashboardView,
});

const lightsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'lights',
  component: LightsDashboardView,
});

const switchesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'switches',
  component: SwitchesDashboardView,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  energyRoute,
  lightsRoute,
  switchesRoute,
  entitiesRoute,
]);

export const router = new Router({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const AppRouterProvider = () => <RouterProvider router={router} />;
