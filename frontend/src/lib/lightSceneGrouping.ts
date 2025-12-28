import type { HaEntity } from '../api/types';
import { getAreaId, getFriendlyName } from './climateGrouping';

const normalizeEntityList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
};

export const isLightEntity = (entity: HaEntity) => entity.entity_id.startsWith('light.');
export const isSceneEntity = (entity: HaEntity) => entity.entity_id.startsWith('scene.');

export const getLightGroupMembers = (entity: HaEntity) => normalizeEntityList(entity.attributes.entity_id);
export const getSceneMembers = (entity: HaEntity) =>
  normalizeEntityList(entity.attributes.entity_id ?? entity.attributes.light_id);

export const isLightGroupEntity = (entity: HaEntity) => getLightGroupMembers(entity).length > 0;

const resolveSceneAreaId = (scene: HaEntity, entityMap: Map<string, HaEntity>) => {
  const explicitArea = getAreaId(scene);
  if (explicitArea && explicitArea !== 'unassigned') {
    return explicitArea;
  }
  const members = getSceneMembers(scene);
  for (const memberId of members) {
    const member = entityMap.get(memberId);
    if (member) {
      const memberArea = getAreaId(member);
      if (memberArea && memberArea !== 'unassigned') {
        return memberArea;
      }
    }
  }
  return explicitArea;
};

const computeSceneScore = (
  group: HaEntity,
  groupMembers: Set<string>,
  scene: HaEntity,
  sceneArea: string,
  entityMap: Map<string, HaEntity>,
) => {
  const sceneMembers = getSceneMembers(scene);
  let score = 0;
  let hasOverlap = false;
  sceneMembers.forEach((memberId) => {
    if (memberId === group.entity_id) {
      score += 10;
      hasOverlap = true;
    } else if (groupMembers.has(memberId)) {
      score += 5;
      hasOverlap = true;
    } else {
      const member = entityMap.get(memberId);
      if (member && getAreaId(member) === getAreaId(group)) {
        score += 1;
      }
    }
  });

  if (sceneMembers.length === 0 && sceneArea === getAreaId(group)) {
    score += 1;
  }

  if (sceneArea === getAreaId(group)) {
    score += 2;
  }

  const sceneName = getFriendlyName(scene).toLowerCase();
  const groupName = getFriendlyName(group).toLowerCase();
  if (sceneName.includes(groupName) || groupName.includes(sceneName)) {
    score += 1;
  }

  if (!hasOverlap && score > 2) {
    score -= 1;
  }

  return score;
};

export const buildLightSceneAssociations = (entities: HaEntity[]) => {
  const entityMap = new Map(entities.map((entity) => [entity.entity_id, entity] as const));
  const lightGroups = entities.filter((entity) => isLightGroupEntity(entity));
  const scenes = entities.filter((entity) => isSceneEntity(entity));
  const sceneAreaMap = new Map<string, HaEntity[]>();

  scenes.forEach((scene) => {
    const areaId = resolveSceneAreaId(scene, entityMap);
    const bucket = sceneAreaMap.get(areaId) ?? [];
    bucket.push(scene);
    sceneAreaMap.set(areaId, bucket);
  });

  const association = new Map<string, HaEntity[]>();

  lightGroups.forEach((group) => {
    const areaId = getAreaId(group);
    const areaScenes = sceneAreaMap.get(areaId) ?? [];
    if (areaScenes.length === 0) {
      return;
    }
    const members = new Set(getLightGroupMembers(group));
    const rankedScenes = areaScenes
      .map((scene) => ({
        scene,
        score: computeSceneScore(group, members, scene, areaId, entityMap),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return getFriendlyName(a.scene).localeCompare(getFriendlyName(b.scene), 'es', { sensitivity: 'base' });
      })
      .map(({ scene }) => scene);
    association.set(group.entity_id, rankedScenes);
  });

  return association;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const stripGroupNameFromScene = (sceneName: string, groupName: string) => {
  const cleanScene = sceneName.trim();
  const cleanGroup = groupName.trim();
  if (!cleanScene || !cleanGroup) {
    return cleanScene || sceneName;
  }
  const pattern = new RegExp(`^${escapeRegExp(cleanGroup)}[\\s:-]*`, 'i');
  const stripped = cleanScene.replace(pattern, '').trim();
  if (stripped.length === 0) {
    return cleanScene;
  }
  return stripped;
};
