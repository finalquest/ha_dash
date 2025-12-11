import { useMemo, useState } from 'react';
import { useAreas } from '../hooks/useAreas';
import { useEntities } from '../hooks/useEntities';
import type { HaEntity } from '../api/types';

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
  const { data: entities = [], isLoading: isLoadingEntities, isError: entitiesError } = useEntities();
  const { data: areas = [], isLoading: isLoadingAreas, isError: areasError } = useAreas();
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<'all' | string>('all');

  const grouped = useMemo(() => {
    const filtered = filterEntities(entities, search, selectedArea);
    const areaNameMap = new Map<string, string>(areas.map((area) => [area.area_id, area.name]));

    return filtered.reduce<Record<string, { name: string; items: HaEntity[] }>>((acc, entity) => {
      const areaId = entity.attributes.area_id || NO_AREA_KEY;
      if (!acc[areaId]) {
        const areaName = areaId === NO_AREA_KEY ? 'Sin zona' : areaNameMap.get(areaId) ?? 'Zona desconocida';
        acc[areaId] = { name: areaName, items: [] };
      }
      acc[areaId].items.push(entity);
      return acc;
    }, {});
  }, [areas, entities, search, selectedArea]);

  if (isLoadingEntities || isLoadingAreas) {
    return (
      <section className="panel">
        <p>Cargando entidades...</p>
      </section>
    );
  }

  if (entitiesError || areasError) {
    return (
      <section className="panel">
        <p>Hubo un problema al cargar las entidades o zonas.</p>
      </section>
    );
  }

  const areaOptions = [{ value: 'all', label: 'Todas las zonas' }].concat(
    areas.map((area) => ({ value: area.area_id, label: area.name })),
  );

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
          <option value={NO_AREA_KEY}>Sin zona</option>
        </select>
      </div>

      {Object.entries(grouped).map(([areaId, group]) => (
        <section key={areaId} className="panel entity-group">
          <h3>{group.name}</h3>
          <ul>
            {group.items.map((entity) => (
              <li key={entity.entity_id}>
                <strong>{entity.attributes.friendly_name ?? entity.entity_id}</strong>
                <span>{entity.state}</span>
                {entity.attributes.unit_of_measurement && (
                  <small>{entity.attributes.unit_of_measurement as string}</small>
                )}
              </li>
            ))}
          </ul>
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
