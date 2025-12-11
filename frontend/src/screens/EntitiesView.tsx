import { useMemo, useState } from 'react';
import { useAreas } from '../hooks/useAreas';
import { useEntities } from '../hooks/useEntities';
import type { AreaEntry, HaEntity } from '../api/types';
import { EntityCard } from '../components/EntityCard';

const NO_AREA_KEY = 'unassigned';

const filterEntities = (
  entities: HaEntity[],
  searchText: string,
  selectedArea: string,
) => {
  const text = searchText.trim().toLowerCase();
  return entities.filter((entity) => {
    const matchesArea =
      selectedArea === 'all' || (entity.attributes.area_id ?? NO_AREA_KEY) === selectedArea;
    if (!matchesArea) return false;

    if (!text) return true;
    const name = (entity.attributes.friendly_name as string | undefined)?.toLowerCase() ?? '';
    return entity.entity_id.toLowerCase().includes(text) || name.includes(text);
  });
};

export const EntitiesView = () => {
  const {
    data: entities = [],
    isLoading: isLoadingEntities,
    isError: entitiesError,
    error: entitiesQueryError,
  } = useEntities();
  const {
    data: areas = [],
    isLoading: isLoadingAreas,
    isError: areasError,
    error: areasQueryError,
  } = useAreas();
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<'all' | string>('all');

  const areaNameMap = useMemo(() => {
    const map = new Map<string, string>();

    areas.forEach((entry: AreaEntry) => {
      if (typeof entry === 'string') {
        map.set(entry, entry);
      } else if (entry.area_id) {
        map.set(entry.area_id, entry.name ?? entry.area_id);
      }
    });

    entities.forEach((entity) => {
      const areaId = entity.attributes.area_id as string | undefined;
      const areaName = entity.attributes.area_name as string | undefined;
      if (areaId && areaName && !map.has(areaId)) {
        map.set(areaId, areaName);
      }
    });

    return map;
  }, [areas, entities]);

  const areaOptions = useMemo(() => {
    const derived = Array.from(areaNameMap.entries()).map(([value, label]) => ({ value, label }));
    derived.sort((a, b) => a.label.localeCompare(b.label));

    return [
      { value: 'all', label: 'Todas las zonas' },
      ...derived,
      { value: NO_AREA_KEY, label: 'Sin zona' },
    ];
  }, [areaNameMap]);

  const grouped = useMemo(() => {
    const filtered = filterEntities(entities, search, selectedArea);
    return filtered.reduce<Record<string, { name: string; items: HaEntity[] }>>((acc, entity) => {
      const areaId = (entity.attributes.area_id as string | undefined) || NO_AREA_KEY;
      if (!acc[areaId]) {
        const areaName = areaId === NO_AREA_KEY ? 'Sin zona' : areaNameMap.get(areaId) ?? areaId;
        acc[areaId] = { name: areaName, items: [] };
      }
      acc[areaId].items.push(entity);
      return acc;
    }, {});
  }, [areaNameMap, entities, search, selectedArea]);

  if (isLoadingEntities || isLoadingAreas) {
    return (
      <section className="panel">
        <p>Cargando entidades...</p>
      </section>
    );
  }

  if (entitiesError || areasError) {
    console.error('Failed to load entities or areas', { entitiesQueryError, areasQueryError });
    const message =
      (entitiesQueryError as Error | undefined)?.message ||
      (areasQueryError as Error | undefined)?.message ||
      'Hubo un problema al cargar las entidades o zonas.';
    return (
      <section className="panel">
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section>
      <div className="panel filters">
        <input
          type="text"
          placeholder="Buscar por nombre o entity_id"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)}>
          {areaOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {Object.entries(grouped).map(([areaId, group]) => (
        <section key={areaId} className="panel entity-group">
          <h3>{group.name}</h3>
          <div className="entity-grid">
            {group.items.map((entity) => (
              <EntityCard key={entity.entity_id} entity={entity} areaName={group.name} />
            ))}
          </div>
        </section>
      ))}

      {Object.keys(grouped).length === 0 && (
        <section className="panel">
          <p>No se encontraron entidades con los filtros aplicados.</p>
        </section>
      )}
    </section>
  );
};
