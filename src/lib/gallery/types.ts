export interface CatalogEntry {
  id: string;
  title: string;
  base64: string;
  author: string;
  authorUrl: string;
  permalink: string;
  postDate: string;
  score?: number;
  decodedName: string;
  width: number;
  height: number;
  tileCount: number;
  blockCounts: Record<string, number>;
  tags: string[];
  contentHash: string;
}

export interface SchematicCatalog {
  updatedAt: string;
  source: string;
  schematics: CatalogEntry[];
}

export interface RawSeedPost {
  author?: string;
  permalink?: string;
  created_utc?: number;
  createdAt?: string;
  score?: number;
  title?: string;
  body?: string;
  selftext?: string;
  url?: string;
}

export interface RawSeedFile {
  posts?: RawSeedPost[];
}
