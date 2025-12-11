export interface HomeAssistantContext {
  id: string;
  parent_id: string | null;
  user_id: string | null;
}

export interface HomeAssistantEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  last_reported?: string;
  context: HomeAssistantContext;
}

export interface HomeAssistantArea {
  area_id: string;
  name: string;
  picture?: string | null;
  aliases?: string[];
  icon?: string | null;
  floor_id?: string | null;
}

export interface HomeAssistantEntityMetadata {
  entity_id: string;
  area_id?: string | null;
  device_id?: string | null;
}

export interface HomeAssistantHistoryEntry {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: Record<string, unknown>;
}
