import { getBlockSpec } from '../blocks/catalog';
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

const POWER_CLASSES = new Set([
  'ConsumeGenerator',
  'HeaterGenerator',
  'ImpactReactor',
  'NuclearReactor',
  'VariableReactor',
  'SolarGenerator',
  'ThermalGenerator',
  'Battery',
  'PowerNode',
  'BeamNode',
  'LongPowerNode',
  'PowerDiode',
]);

const DEFENSE_CLASSES = new Set([
  'ItemTurret',
  'PowerTurret',
  'LiquidTurret',
  'ContinuousTurret',
  'ContinuousLiquidTurret',
  'LaserTurret',
  'PointDefenseTurret',
  'TractorBeamTurret',
  'BuildTurret',
  'ForceProjector',
  'MendProjector',
  'OverdriveProjector',
  'RegenProjector',
  'ShockwaveTower',
  'Wall',
  'ShieldWall',
  'AutoDoor',
  'BaseShield',
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

const UNIT_CLASSES = new Set([
  'UnitFactory',
  'Reconstructor',
  'UnitAssembler',
  'UnitAssemblerModule',
  'UnitCargoLoader',
  'UnitCargoUnloadPoint',
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

const PRODUCTION_CLASSES = new Set([
  'GenericCrafter',
  'HeatCrafter',
  'AttributeCrafter',
  'Separator',
  'HeatProducer',
]);

const LOGIC_CLASSES = new Set([
  'LogicBlock',
  'LogicDisplay',
  'TileableLogicDisplay',
  'MemoryBlock',
  'SwitchBlock',
  'MessageBlock',
  'CanvasBlock',
]);

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

export function inferCategoryTags(blockNames: Iterable<string>): AutoTag[] {
  const tags = new Set<AutoTag>();
  let production = false;
  for (const name of blockNames) {
    const product = PRODUCT_BLOCKS[name];
    if (product) tags.add(product);
    const spec = getBlockSpec(name);
    const cls = spec?.className ?? '';
    if (POWER_CLASSES.has(cls) || /generator|reactor|battery|solar|beam-node|power-node/.test(name)) {
      tags.add(TAGS.power);
    }
    if (DEFENSE_CLASSES.has(cls) || /turret|wall|projector|mender/.test(name)) {
      tags.add(TAGS.defense);
    }
    if (MINING_CLASSES.has(cls) || /drill|bore|crusher/.test(name)) {
      tags.add(TAGS.mining);
    }
    if (LOGISTICS_CLASSES.has(cls) || /duct|conveyor|router|junction|bridge|unloader|sorter/.test(name)) {
      tags.add(TAGS.logistics);
    }
    if (UNIT_CLASSES.has(cls) || /factory|reconstructor|assembler|fabricator|refabricator/.test(name)) {
      tags.add(TAGS.units);
    }
    if (LIQUID_CLASSES.has(cls) || /conduit|pump|liquid-tank|liquid-container/.test(name)) {
      tags.add(TAGS.liquids);
    }
    if (LOGIC_CLASSES.has(cls) || /processor|logic-display|memory-/.test(name)) {
      tags.add(TAGS.logic);
    }
    if (PRODUCTION_CLASSES.has(cls)) production = true;
  }
  if (production && ![TAGS.silicon, TAGS.graphite, TAGS.plastanium, TAGS.phase, TAGS.surge, TAGS.carbide, TAGS.cryofluid].some((t) => tags.has(t))) {
    tags.add(TAGS.production);
  } else if (production) {
    tags.add(TAGS.production);
  }
  return [...tags];
}

export function tagSchematic(schem: Schematic): string[] {
  const names = schem.tiles.map((t) => t.block);
  const bounds = schematicWorldBounds(schem.tiles);
  const width = schem.width || bounds.width;
  const height = schem.height || bounds.height;
  const tags = new Set<string>([
    ...inferPlanetTags(names),
    ...inferCategoryTags(names),
    sizeBucket(width, height),
  ]);
  return [...tags].sort();
}

export const ALL_AUTO_TAGS: AutoTag[] = Object.values(TAGS);
