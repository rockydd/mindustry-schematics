import React from 'react';
import type { Tile } from '../lib/schematic/types';
import { getBlockSpec } from '../lib/blocks/blocks';

export interface PreviewGridProps {
  tiles: Tile[];
  // Optional: override size
  scale?: number; // pixels per tile
}

const blockColor: Record<string, string> = {
  'silicon-arc-furnace': '#ffb347',
  duct: '#8ad0ff',
  'duct-router': '#4fb4ff',
  'beam-node': '#ffd1dc',
};

export const PreviewGrid: React.FC<PreviewGridProps> = ({ tiles, scale = 24 }) => {
  if (!tiles.length) return <div style={{ padding: 12, color: '#888' }}>No tiles</div>;

  // Bounds
  const xs = tiles.map((t) => t.x);
  const ys = tiles.map((t) => t.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = (maxX - minX + 1) * scale;
  const height = (maxY - minY + 1) * scale;

  return (
    <svg width={width + 1} height={height + 1} style={{ border: '1px solid #eee', background: '#fafafa' }}>
      {/* grid */}
      {Array.from({ length: maxX - minX + 2 }).map((_, i) => (
        <line key={`vx${i}`} x1={i * scale} y1={0} x2={i * scale} y2={height} stroke="#eee" />
      ))}
      {Array.from({ length: maxY - minY + 2 }).map((_, i) => (
        <line key={`hy${i}`} x1={0} y1={i * scale} x2={width} y2={i * scale} stroke="#eee" />
      ))}
      {/* blocks */}
      {tiles.map((t, idx) => {
        const spec = getBlockSpec(t.block);
        const size = spec?.size ?? 1;
        const half = Math.floor(size / 2);
        const left = (t.x - minX - half) * scale;
        const top = (maxY - (t.y + half)) * scale; // invert y for svg
        const color = blockColor[t.block] ?? '#ccc';
        return (
          <g key={idx}>
            <rect x={left} y={top} width={size * scale} height={size * scale} fill={color} stroke="#444" />
            <text
              x={left + (size * scale) / 2}
              y={top + (size * scale) / 2}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={Math.max(10, Math.min(14, scale / 1.5))}
              fill="#000"
            >
              {labelForBlock(t.block)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

function labelForBlock(name: string): string {
  if (name === 'silicon-arc-furnace') return 'ArcF';
  if (name === 'duct-router') return 'Router';
  if (name === 'beam-node') return 'Beam';
  return name;
}

