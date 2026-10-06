import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { FighterConfig } from '../types';
import { avatarUrl } from '../game/sprites';

export const credits = (amount: number) => Math.round(amount).toLocaleString('en-US');
export const Avatar = memo(function Avatar({ fighter, size = 42 }: { fighter: FighterConfig; size?: number }) {
  return <span className="avatar" style={{ '--fighter-color': fighter.color, width: size, height: size } as CSSProperties}><img src={avatarUrl(fighter)} alt={`${fighter.name} pixel fighter`} draggable={false}/></span>;
});
export const Sparkline = memo(function Sparkline({ values, color, width = 88, height = 30 }: { values: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((v, i) => `${i / Math.max(1, values.length - 1) * width},${height - 3 - (v - min) / range * (height - 6)}`).join(' ');
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline" role="img" aria-label={`Price trend ${values.at(-1)! >= values[0] ? 'up' : 'down'}`}><polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/></svg>;
});
export function Coin({ small = false }: { small?: boolean }) { return <span aria-hidden="true" className={`coin ${small ? 'small' : ''}`}>R</span>; }
