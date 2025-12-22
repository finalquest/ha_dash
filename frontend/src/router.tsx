import {
  Router,
  RouterProvider,
  Route,
  RootRoute,
  Outlet,
} from '@tanstack/react-router';
import { RootLayout } from './layouts/RootLayout';
import { DashboardView } from './screens/DashboardView';
import { EntitiesView } from './screens/EntitiesView';
import { EnergyDashboardView } from './screens/EnergyDashboardView';
import { LightsDashboardView } from './screens/LightsDashboardView';
import { SwitchesDashboardView } from './screens/SwitchesDashboardView';
import { ClimateDashboardView } from './screens/ClimateDashboardView';
import { SensorsDashboardView } from './screens/SensorsDashboardView';

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

const climateRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'climate',
  component: ClimateDashboardView,
});

const switchesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'switches',
  component: SwitchesDashboardView,
});

const sensorsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'sensors',
  component: SensorsDashboardView,
});

const SectionLayout = () => <Outlet />;

const dashboardSectionRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'dashboard',
  component: SectionLayout,
});

const dashboardFavoritesRoute = new Route({
  getParentRoute: () => dashboardSectionRoute,
  path: 'favorites',
  component: DashboardView,
});

const dashboardEnergyRoute = new Route({
  getParentRoute: () => dashboardSectionRoute,
  path: 'energy',
  component: EnergyDashboardView,
});

const dashboardSwitchesRoute = new Route({
  getParentRoute: () => dashboardSectionRoute,
  path: 'switches',
  component: SwitchesDashboardView,
});

const liveSectionRoute = new Route({
  getParentRoute: () => rootRoute,
  path: 'live',
  component: SectionLayout,
});

const liveAllRoute = new Route({
  getParentRoute: () => liveSectionRoute,
  path: 'all',
  component: EntitiesView,
});

const liveEnergyRoute = new Route({
  getParentRoute: () => liveSectionRoute,
  path: 'energy',
  component: EnergyDashboardView,
});

const liveClimateRoute = new Route({
  getParentRoute: () => liveSectionRoute,
  path: 'climate',
  component: ClimateDashboardView,
});

const liveLightsRoute = new Route({
  getParentRoute: () => liveSectionRoute,
  path: 'lights',
  component: LightsDashboardView,
});

const liveSwitchesRoute = new Route({
  getParentRoute: () => liveSectionRoute,
  path: 'switches',
  component: SwitchesDashboardView,
});

const liveSensorsRoute = new Route({
  getParentRoute: () => liveSectionRoute,
  path: 'sensors',
  component: SensorsDashboardView,
});

dashboardSectionRoute.addChildren([
  dashboardFavoritesRoute,
  dashboardEnergyRoute,
  dashboardSwitchesRoute,
]);

liveSectionRoute.addChildren([
  liveAllRoute,
  liveClimateRoute,
  liveEnergyRoute,
  liveLightsRoute,
  liveSwitchesRoute,
  liveSensorsRoute,
]);

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  energyRoute,
  lightsRoute,
  climateRoute,
  switchesRoute,
  sensorsRoute,
  entitiesRoute,
  dashboardSectionRoute,
  liveSectionRoute,
]);

export const router = new Router({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const AppRouterProvider = () => <RouterProvider router={router} />;
