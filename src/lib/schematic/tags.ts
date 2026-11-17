import { getBlockSize, getBlockSpec } from '../blocks/catalog';
import { schematicWorldBounds } from './stats';
import type { Schematic } from './types';

/** Stable auto-tag slugs used in the gallery. */
export const TAGS = {
  erekir: 'erekir',
  serpulo: 'serpulo',
  silicon: 'silicon',
  graphite: 'graphite',
  plastanium: 'plastanium',
  phase: 'phase',
  surge: 'surge',
  carbide: 'carbide',
  cryofluid: 'cryofluid',
  power: 'power',
  defense: 'defense',
  mining: 'mining',
  logistics: 'logistics',
  units: 'units',
  liquids: 'liquids',
  production: 'production',
  logic: 'logic',
  small: 'small',
  medium: 'medium',
  large: 'large',
} as const;

export type AutoTag = (typeof TAGS)[keyof typeof TAGS];

/** Planet + size + a couple of primary-purpose tags. */
export const MAX_TAGS = 5;

const EREKIR_BLOCKS = new Set([
  'duct',
  'armored-duct',
  'duct-router',
  'overflow-duct',
  'underflow-duct',
  'duct-bridge',
  'duct-unloader',
  'beam-node',
  'beam-tower',
  'beam-link',
  'silicon-arc-furnace',
  'electrolyzer',
  'oxidation-chamber',
  'slag-centrifuge',
  'carbide-crucible',
  'surge-crucible',
  'cyanogen-synthesizer',
  'atmospheric-concentrator',
  'turbine-condenser',
  'chemical-combustion-chamber',
  'pyrolysis-generator',
  'vent-condenser',
  'plasma-bore',
  'large-plasma-bore',
  'impact-drill',
  'eruption-drill',
  'cliff-crusher',
  'large-cliff-crusher',
  'tungsten-wall',
  'tungsten-wall-large',
  'beryllium-wall',
  'beryllium-wall-large',
  'carbide-wall',
  'carbide-wall-large',
  'reinforced-conduit',
  'reinforced-bridge-conduit',
  'reinforced-liquid-router',
  'reinforced-liquid-container',
  'reinforced-liquid-tank',
  'reinforced-liquid-junction',
  'reinforced-pump',
  'reinforced-container',
  'reinforced-vault',
  'reinforced-payload-conveyor',
  'reinforced-payload-router',
  'reinforced-surge-wall',
  'core-bastion',
  'core-citadel',
  'core-acropolis',
  'tank-assembler',
  'mech-assembler',
  'ship-assembler',
  'tank-fabricator',
  'mech-fabricator',
  'ship-fabricator',
  'tank-refabricator',
  'mech-refabricator',
  'ship-refabricator',
  'prime-refabricator',
  'unit-cargo-loader',
  'unit-cargo-unload-point',
  'breach',
  'diffuse',
  'sublimate',
  'titan',
  'afflict',
  'lustre',
  'scathe',
  'smite',
  'malign',
  'disperse',
  'electric-heater',
  'slag-heater',
  'heat-reactor',
  'flux-reactor',
  'neoplasia-reactor',
  'build-tower',
  'radar',
  'shield-projector',
  'large-shield-projector',
  'regen-projector',
  'shockwave-tower',
  'phase-synthesizer',
]);

const SERPULO_BLOCKS = new Set([
  'conveyor',
  'titanium-conveyor',
  'armored-conveyor',
  'junction',
  'router',
  'distributor',
  'overflow-gate',
  'underflow-gate',
  'sorter',
  'inverted-sorter',
  'bridge-conveyor',
  'phase-conveyor',
  'silicon-smelter',
  'silicon-crucible',
  'graphite-press',
  'multi-press',
  'coal-centrifuge',
  'pulverizer',
  'kiln',
  'plastanium-compressor',
  'phase-weaver',
  'surge-smelter',
  'cryofluid-mixer',
  'mechanical-drill',
  'pneumatic-drill',
  'laser-drill',
  'blast-drill',
  'copper-wall',
  'copper-wall-large',
  'titanium-wall',
  'titanium-wall-large',
  'thorium-wall',
  'thorium-wall-large',
  'duo',
  'scatter',
  'scorch',
  'hail',
  'wave',
  'lancer',
  'arc',
  'swarmer',
  'salvo',
  'tsunami',
  'fuse',
  'ripple',
  'cyclone',
  'foreshadow',
  'spectre',
  'meltdown',
  'core-shard',
  'core-foundation',
  'core-nucleus',
  'power-node',
  'power-node-large',
  'battery',
  'battery-large',
  'combustion-generator',
  'steam-generator',
  'differential-generator',
  'rtg-generator',
  'solar-panel',
  'solar-panel-large',
  'thorium-reactor',
  'impact-reactor',
  'ground-factory',
  'air-factory',
  'naval-factory',
  'additive-reconstructor',
  'multiplicative-reconstructor',
  'exponential-reconstructor',
  'tetrative-reconstructor',
  'mass-driver',
  'unloader',
  'container',
  'vault',
  'mender',
  'mend-projector',
  'force-projector',
  'overdrive-projector',
  'overdrive-dome',
  'conduit',
  'pulse-conduit',
  'plated-conduit',
  'bridge-conduit',
  'phase-conduit',
]);

const PRODUCT_BLOCKS: Record<string, AutoTag> = {
  'silicon-smelter': TAGS.silicon,
  'silicon-crucible': TAGS.silicon,
  'silicon-arc-furnace': TAGS.silicon,
  'graphite-press': TAGS.graphite,
  'multi-press': TAGS.graphite,
  'plastanium-compressor': TAGS.plastanium,
  'phase-weaver': TAGS.phase,
  'phase-synthesizer': TAGS.phase,
  'surge-smelter': TAGS.surge,
  'surge-crucible': TAGS.surge,
  'carbide-crucible': TAGS.carbide,
  'cryofluid-mixer': TAGS.cryofluid,
};

/** Generators / reactors only — not nodes or batteries. */
const GENERATOR_CLASSES = new Set([
  'ConsumeGenerator',
  'HeaterGenerator',
  'ImpactReactor',
  'NuclearReactor',
  'VariableReactor',
  'SolarGenerator',
  'ThermalGenerator',
]);

const TURRET_CLASSES = new Set([
  'ItemTurret',
  'PowerTurret',
  'LiquidTurret',
  'ContinuousTurret',
  'ContinuousLiquidTurret',
  'LaserTurret',
  'PointDefenseTurret',
  'TractorBeamTurret',
  'BuildTurret',
]);

const MINING_CLASSES = new Set(['Drill', 'BeamDrill', 'BurstDrill', 'WallCrafter', 'Fracker']);

const LOGISTICS_CLASSES = new Set([
  'Duct',
  'DuctRouter',
  'DuctBridge',
  'OverflowDuct',
  'Conveyor',
  'ArmoredConveyor',
  'StackConveyor',
  'StackRouter',
  'Router',
  'Junction',
  'Sorter',
  'OverflowGate',
  'ItemBridge',
  'BufferedItemBridge',
  'MassDriver',
  'Unloader',
  'DirectionalUnloader',
  'PayloadConveyor',
  'PayloadRouter',
  'PayloadMassDriver',
]);

const UNIT_FACTORY_CLASSES = new Set([
  'UnitFactory',
  'Reconstructor',
  'UnitAssembler',
  'UnitAssemblerModule',
]);

const LIQUID_CLASSES = new Set([
  'Conduit',
  'ArmoredConduit',
  'LiquidRouter',
  'LiquidJunction',
  'LiquidBridge',
  'DirectionLiquidBridge',
  'Pump',
  'SolidPump',
]);

const CRAFTER_CLASSES = new Set(['GenericCrafter', 'HeatCrafter', 'AttributeCrafter', 'Separator']);

const PROCESSOR_CLASSES = new Set(['LogicBlock']);

const POWER_SUPPORT_CLASSES = new Set(['Battery', 'PowerNode', 'BeamNode', 'LongPowerNode', 'PowerDiode']);

export function sizeBucket(width: number, height: number): AutoTag {
  const m = Math.max(width, height);
  if (m <= 12) return TAGS.small;
  if (m <= 28) return TAGS.medium;
  return TAGS.large;
}

export function inferPlanetTags(blockNames: Iterable<string>): AutoTag[] {
  let erekir = 0;
  let serpulo = 0;
  for (const name of blockNames) {
    if (EREKIR_BLOCKS.has(name)) erekir += 1;
    if (SERPULO_BLOCKS.has(name)) serpulo += 1;
  }
  const tags: AutoTag[] = [];
  if (erekir > 0) tags.push(TAGS.erekir);
  if (serpulo > 0) tags.push(TAGS.serpulo);
  return tags;
}

type PurposeCounts = {
  products: Set<AutoTag>;
  generators: number;
  generatorFoot: number;
  turrets: number;
  turretFoot: number;
  drills: number;
  drillFoot: number;
  logistics: number;
  logisticsFoot: number;
  unitFactories: number;
  unitFoot: number;
  liquids: number;
  liquidFoot: number;
  processors: number;
  processorFoot: number;
  crafters: number;
  crafterFoot: number;
  tiles: number;
  footprint: number;
};

function footprintOf(name: string): number {
  const s = getBlockSize(name);
  return s * s;
}

function isGenerator(name: string, cls: string): boolean {
  if (POWER_SUPPORT_CLASSES.has(cls)) return false;
  if (/battery|power-node|beam-node|beam-tower|beam-link/.test(name)) return false;
  if (GENERATOR_CLASSES.has(cls)) return true;
  return /^(combustion-generator|steam-generator|differential-generator|rtg-generator|solar-panel|thorium-reactor|impact-reactor|turbine-condenser|chemical-combustion-chamber|pyrolysis-generator|flux-reactor|neoplasia-reactor|thermal-generator)/.test(
    name,
  );
}

function isTurret(name: string, cls: string): boolean {
  if (TURRET_CLASSES.has(cls)) return true;
  return /-(turret)$/.test(name) || ['duo', 'scatter', 'scorch', 'hail', 'wave', 'lancer', 'arc', 'swarmer', 'salvo', 'tsunami', 'fuse', 'ripple', 'cyclone', 'foreshadow', 'spectre', 'meltdown', 'breach', 'diffuse', 'sublimate', 'titan', 'afflict', 'lustre', 'scathe', 'smite', 'malign', 'disperse'].includes(name);
}

function isUnitFactory(name: string, cls: string): boolean {
  if (UNIT_FACTORY_CLASSES.has(cls)) return true;
  return /factory|reconstructor|assembler|fabricator|refabricator/.test(name);
}

function isProcessor(name: string, cls: string): boolean {
  if (PROCESSOR_CLASSES.has(cls)) return true;
  return /processor$/.test(name);
}

function isDrill(name: string, cls: string): boolean {
  if (MINING_CLASSES.has(cls)) return true;
  return /drill|bore|crusher|fracker/.test(name);
}

function isCrafter(name: string, cls: string): boolean {
  if (name in PRODUCT_BLOCKS) return true;
  return CRAFTER_CLASSES.has(cls);
}

function isLogistics(name: string, cls: string): boolean {
  if (LOGISTICS_CLASSES.has(cls)) return true;
  return /^(duct|armored-duct|conveyor|titanium-conveyor|armored-conveyor|router|junction|sorter|inverted-sorter|overflow-gate|underflow-gate|bridge-conveyor|phase-conveyor|unloader|mass-driver)/.test(
    name,
  );
}

function isLiquid(name: string, cls: string): boolean {
  if (LIQUID_CLASSES.has(cls)) return true;
  return /conduit|pump|liquid-tank|liquid-container|water-extractor/.test(name);
}

function countPurposes(blockNames: Iterable<string>): PurposeCounts {
  const out: PurposeCounts = {
    products: new Set(),
    generators: 0,
    generatorFoot: 0,
    turrets: 0,
    turretFoot: 0,
    drills: 0,
    drillFoot: 0,
    logistics: 0,
    logisticsFoot: 0,
    unitFactories: 0,
    unitFoot: 0,
    liquids: 0,
    liquidFoot: 0,
    processors: 0,
    processorFoot: 0,
    crafters: 0,
    crafterFoot: 0,
    tiles: 0,
    footprint: 0,
  };
  for (const name of blockNames) {
    const spec = getBlockSpec(name);
    const cls = spec?.className ?? '';
    const foot = footprintOf(name);
    out.tiles += 1;
    out.footprint += foot;
    const product = PRODUCT_BLOCKS[name];
    if (product) out.products.add(product);
    if (isGenerator(name, cls)) {
      out.generators += 1;
      out.generatorFoot += foot;
    }
    if (isTurret(name, cls)) {
      out.turrets += 1;
      out.turretFoot += foot;
    }
    if (isDrill(name, cls)) {
      out.drills += 1;
      out.drillFoot += foot;
    }
    if (isLogistics(name, cls)) {
      out.logistics += 1;
      out.logisticsFoot += foot;
    }
    if (isUnitFactory(name, cls)) {
      out.unitFactories += 1;
      out.unitFoot += foot;
    }
    if (isLiquid(name, cls)) {
      out.liquids += 1;
      out.liquidFoot += foot;
    }
    if (isProcessor(name, cls)) {
      out.processors += 1;
      out.processorFoot += foot;
    }
    if (isCrafter(name, cls)) {
      out.crafters += 1;
      out.crafterFoot += foot;
    }
  }
  return out;
}

function significant(count: number, foot: number, totalFoot: number): boolean {
  if (count <= 0) return false;
  if (foot / Math.max(1, totalFoot) >= 0.12) return true;
  return count >= 3;
}

/**
 * Primary-purpose tags from the decoded block set.
 * Conveyors / power nodes / batteries do not by themselves mean logistics or power.
 */
export function inferCategoryTags(blockNames: Iterable<string>): AutoTag[] {
  const c = countPurposes(blockNames);
  const tags: AutoTag[] = [...c.products];

  const hasMainCrafter = c.crafters > 0;
  const hasDrills = c.drills > 0;
  const hasTurrets = c.turrets > 0;
  const hasGenerators = c.generators > 0;
  const hasUnitFactories = c.unitFactories > 0;
  const hasProcessors = c.processors > 0;
  const hasProducts = c.products.size > 0;

  if (hasTurrets) tags.push(TAGS.defense);
  if (hasUnitFactories) tags.push(TAGS.units);
  if (hasProcessors) tags.push(TAGS.logic);

  const mixedPurpose = hasMainCrafter || hasDrills || hasTurrets || hasUnitFactories || hasProcessors;
  const powerSignificant =
    c.generators >= 3 ||
    (c.generators >= 2 && significant(c.generators, c.generatorFoot, c.footprint)) ||
    (hasGenerators && !mixedPurpose);
  if (powerSignificant) tags.push(TAGS.power);

  const miningSignificant =
    significant(c.drills, c.drillFoot, c.footprint) ||
    (hasDrills && !hasMainCrafter && !hasTurrets && !hasGenerators && !hasUnitFactories);
  if (miningSignificant) tags.push(TAGS.mining);

  if (hasMainCrafter && !hasProducts) tags.push(TAGS.production);

  const logisticsOnly =
    c.logistics > 0 &&
    !hasMainCrafter &&
    !hasDrills &&
    !hasTurrets &&
    !hasGenerators &&
    !hasUnitFactories &&
    !hasProcessors;
  if (logisticsOnly) tags.push(TAGS.logistics);

  const liquidsOnly =
    c.liquids > 0 &&
    !hasMainCrafter &&
    !hasDrills &&
    !hasTurrets &&
    !hasGenerators &&
    !hasUnitFactories &&
    !logisticsOnly &&
    (significant(c.liquids, c.liquidFoot, c.footprint) || c.liquidFoot > c.processorFoot);
  if (liquidsOnly) tags.push(TAGS.liquids);

  return tags;
}

export function tagSchematic(schem: Schematic): string[] {
  const names = schem.tiles.map((t) => t.block);
  const bounds = schematicWorldBounds(schem.tiles);
  const width = schem.width || bounds.width;
  const height = schem.height || bounds.height;
  const core = [...inferPlanetTags(names), sizeBucket(width, height)];
  const purpose = inferCategoryTags(names);
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const t of [...core, ...purpose]) {
    if (seen.has(t)) continue;
    seen.add(t);
    tags.push(t);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags.sort();
}

export const ALL_AUTO_TAGS: AutoTag[] = Object.values(TAGS);
