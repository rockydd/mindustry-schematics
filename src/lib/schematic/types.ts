export type SchematicTagMap = Record<string, string>;

export type SchematicConfig =
  | null
  | number
  | bigint
  | boolean
  | string
  | { kind: string; [k: string]: unknown };

export interface Tile {
  block: string;
  x: number;
  y: number;
  rotation: number;
  config?: SchematicConfig;
}

export interface Schematic {
  width: number;
  height: number;
  tiles: Tile[];
  tags: SchematicTagMap;
  version?: number;
}
