export type SchematicTagMap = Record<string, string>;

export interface Tile {
  block: string; // content name, e.g., "silicon-arc-furnace"
  x: number; // center tile coordinates
  y: number;
  rotation: number; // 0..3
  // config is serialized via TypeIO-like tags; for MVP we use null
  config?: null | number | string;
}

export interface Schematic {
  width: number; // bounding box width in tiles
  height: number; // bounding box height in tiles
  tiles: Tile[];
  tags: SchematicTagMap;
}

