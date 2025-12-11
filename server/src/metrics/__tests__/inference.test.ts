import fs from 'fs';
import path from 'path';
import { HomeAssistantEntityState } from '../../ha/types';
import { inferMetricGroups } from '../inference';

const loadStatesFixture = (): HomeAssistantEntityState[] => {
  const fixturePath = path.resolve(__dirname, '../../../docs/responses/entities.json');
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content) as HomeAssistantEntityState[];
};

describe('inferMetricGroups', () => {
  const states = loadStatesFixture();

  it('groups power/voltage/current sensors by base id', () => {
    const groups = inferMetricGroups(states);

    const powerGroup = groups.find((group) => group.baseId.includes('sonoff_1001d4e658'));
    expect(powerGroup).toBeDefined();
    expect(Object.keys(powerGroup!.metrics)).toEqual(
      expect.arrayContaining(['power', 'voltage', 'current']),
    );
  });

  it('ignores partial groups with less metrics than threshold', () => {
    const groups = inferMetricGroups(states, { minMetrics: 3 });
    expect(groups.every((group) => Object.keys(group.metrics).length >= 3)).toBe(true);
  });

  it('falls back to friendly names when deriving title', () => {
    const groups = inferMetricGroups(states);
    const group = groups.find((candidate) => candidate.baseId.includes('sonoff_1001d4e658'));
    expect(group?.name).toMatch(/planta/i);
  });
});
