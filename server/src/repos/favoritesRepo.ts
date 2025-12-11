import { randomUUID } from 'crypto';
import { getDb } from '../db/connection';

const db = getDb();

interface FavoriteRow {
  id: string;
  card_type: string;
  config_json: string;
  title?: string | null;
  order_index: number;
  dashboard_id?: string | null;
}

export interface Favorite {
  id: string;
  cardType: string;
  config: Record<string, unknown>;
  title?: string;
  orderIndex: number;
  dashboardId?: string;
}

const selectFavorites = db.prepare(
  'SELECT * FROM favorites WHERE dashboard_id IS NULL OR dashboard_id = ? ORDER BY order_index, created_at'
);
const insertFavorite = db.prepare(
  'INSERT INTO favorites (id, card_type, config_json, title, order_index) VALUES (@id, @card_type, @config_json, @title, @order_index)'
);
const updateFavorite = db.prepare(
  'UPDATE favorites SET card_type = @card_type, config_json = @config_json, title = @title, order_index = @order_index, updated_at = CURRENT_TIMESTAMP WHERE id = @id'
);
const deleteFavoriteStmt = db.prepare('DELETE FROM favorites WHERE id = ?');

const mapRowToFavorite = (row: FavoriteRow): Favorite => ({
  id: row.id,
  cardType: row.card_type,
  config: JSON.parse(row.config_json),
  title: row.title ?? undefined,
  orderIndex: row.order_index,
  dashboardId: row.dashboard_id ?? undefined,
});

export const listFavorites = (dashboardId?: string): Favorite[] => {
  return selectFavorites.all(dashboardId ?? null).map((row) => mapRowToFavorite(row as FavoriteRow));
};

export const upsertFavorite = (payload: {
  id?: string;
  cardType: string;
  config: Record<string, unknown>;
  title?: string;
  orderIndex?: number;
  dashboardId?: string;
}): Favorite => {
  const favorite = {
    id: payload.id ?? randomUUID(),
    card_type: payload.cardType,
    config_json: JSON.stringify(payload.config),
    title: payload.title ?? null,
    order_index: payload.orderIndex ?? 0,
    dashboard_id: payload.dashboardId ?? null,
  };

  if (payload.id) {
    updateFavorite.run(favorite);
  } else {
    insertFavorite.run(favorite);
  }

  return mapRowToFavorite(favorite as FavoriteRow);
};

export const deleteFavorite = (id: string) => {
  deleteFavoriteStmt.run(id);
};
