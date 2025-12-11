export interface HaEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    area_id?: string;
    area_name?: string;
    device_id?: string;
    unit_of_measurement?: string;
  };
  last_changed: string;
  last_updated: string;
}

export type AreaEntry = string | { area_id: string; name: string };

export interface EntitiesResponse {
  ok: boolean;
  entities: HaEntity[];
}

export interface AreasResponse {
  ok: boolean;
  areas: AreaEntry[];
}
