import { randomUUID } from 'crypto';
import { getDb } from '../db/connection';

const db = getDb();

interface DashboardRow {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}

interface DashboardCardRow {
  id: string;
  dashboard_id: string;
  card_type: string;
  config_json: string;
  title?: string | null;
  order_index: number;
}

export interface DashboardCard {
  id: string;
  cardType: string;
  config: Record<string, unknown>;
  title?: string;
  orderIndex: number;
}

export interface Dashboard {
  id: string;
  slug: string;
  name: string;
  description?: string;
  cards: DashboardCard[];
}

const selectDashboards = db.prepare('SELECT * FROM dashboards ORDER BY created_at');
const selectDashboardBySlug = db.prepare('SELECT * FROM dashboards WHERE slug = ?');
const insertDashboard = db.prepare(
  'INSERT INTO dashboards (id, slug, name, description) VALUES (@id, @slug, @name, @description)'
);
const updateDashboard = db.prepare(
  'UPDATE dashboards SET name = @name, description = @description, updated_at = CURRENT_TIMESTAMP WHERE id = @id'
);
const deleteDashboardStmt = db.prepare('DELETE FROM dashboards WHERE id = ?');

const selectCardsByDashboard = db.prepare('SELECT * FROM dashboard_cards WHERE dashboard_id = ? ORDER BY order_index');
const insertCard = db.prepare(
  'INSERT INTO dashboard_cards (id, dashboard_id, card_type, config_json, title, order_index) VALUES (@id, @dashboard_id, @card_type, @config_json, @title, @order_index)'
);
const updateCard = db.prepare(
  'UPDATE dashboard_cards SET card_type = @card_type, config_json = @config_json, title = @title, order_index = @order_index, updated_at = CURRENT_TIMESTAMP WHERE id = @id'
);
const deleteCardStmt = db.prepare('DELETE FROM dashboard_cards WHERE id = ?');

const mapCardRow = (row: DashboardCardRow): DashboardCard => ({
  id: row.id,
  cardType: row.card_type,
  config: JSON.parse(row.config_json),
  title: row.title ?? undefined,
  orderIndex: row.order_index,
});

const mapDashboardRow = (row: DashboardRow): Dashboard => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description ?? undefined,
  cards: selectCardsByDashboard.all(row.id).map((card) => mapCardRow(card as DashboardCardRow)),
});

export const listDashboards = (): Dashboard[] => {
  return selectDashboards.all().map((row) => mapDashboardRow(row as DashboardRow));
};

export const upsertDashboard = (payload: {
  id?: string;
  slug: string;
  name: string;
  description?: string;
}): Dashboard => {
  const dashboard = {
    id: payload.id ?? randomUUID(),
    slug: payload.slug,
    name: payload.name,
    description: payload.description ?? null,
  };

  if (payload.id) {
    updateDashboard.run(dashboard);
  } else {
    insertDashboard.run(dashboard);
  }

  return mapDashboardRow(dashboard as DashboardRow);
};

export const deleteDashboard = (id: string) => {
  deleteDashboardStmt.run(id);
};

export const upsertDashboardCard = (dashboardId: string, payload: {
  id?: string;
  cardType: string;
  config: Record<string, unknown>;
  title?: string;
  orderIndex?: number;
}): DashboardCard => {
  const card = {
    id: payload.id ?? randomUUID(),
    dashboard_id: dashboardId,
    card_type: payload.cardType,
    config_json: JSON.stringify(payload.config),
    title: payload.title ?? null,
    order_index: payload.orderIndex ?? 0,
  };

  if (payload.id) {
    updateCard.run(card);
  } else {
    insertCard.run(card);
  }

  return mapCardRow(card as DashboardCardRow);
};

export const deleteDashboardCard = (id: string) => {
  deleteCardStmt.run(id);
};

export const getDashboardBySlug = (slug: string): Dashboard | undefined => {
  const row = selectDashboardBySlug.get(slug) as DashboardRow | undefined;
  if (!row) return undefined;
  return mapDashboardRow(row);
};
