import L from 'leaflet';
import { technicianAvatarUrl, DEFAULT_TECHNICIAN_AVATAR } from '@/lib/technicianAvatar';

/**
 * Couleurs de référence par catégorie d'intervention (source unique réutilisée
 * par les cartes). Alignées sur `RightMapTech`.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  locksmith: '#6366f1',
  plumbing: '#0ea5e9',
  electricity: '#f59e0b',
  glazing: '#06b6d4',
  heating: '#ef4444',
  aircon: '#3b82f6',
};

/** Icône SVG (inline) par catégorie d'intervention. */
export const CATEGORY_SVG: Record<string, string> = {
  locksmith:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="white"><path d="M12 2a5 5 0 0 0-5 5v2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v2H9V7a3 3 0 0 1 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>',
  plumbing:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="white"><path d="M21 17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2h18v2zM3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H3V5zm9 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
  electricity:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  glazing:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
  heating:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="white"><path d="M12 23c-4.97 0-9-4.03-9-9 0-4.17 6-12 9-14 3 2 9 9.83 9 14 0 4.97-4.03 9-9 9zm0-4a5 5 0 0 0 5-5c0-2.65-3.28-7.04-5-9-1.72 1.96-5 6.35-5 9a5 5 0 0 0 5 5z"/></svg>',
  aircon:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="white"><path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22v-2z"/></svg>',
};

/** Couleur par catégorie (fallback gris). */
export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#6b7280';
}

/** Marqueur d'intervention : pastille colorée par catégorie + icône de la catégorie. */
export function makeInterventionIcon(category: string, faded = false, selected = false): L.DivIcon {
  const color = categoryColor(category);
  const svg =
    CATEGORY_SVG[category] ??
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="white"><circle cx="12" cy="12" r="6"/></svg>';
  const opacity = faded ? '0.55' : '1';
  const size = selected ? 38 : 30;
  const anchor = selected ? 19 : 15;
  const border = selected ? '3px solid #f59e0b' : '2.5px solid white';
  const ring = selected
    ? '<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #f59e0b;opacity:0.6;"></div>'
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">${ring}<div style="width:${size}px;height:${size}px;background:${color};border:${border};border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;opacity:${opacity};">${svg}</div></div>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
  });
}

/** Marqueur technicien : photo ronde + anneau vert (disponible) / orange (en intervention). */
export function makeTechnicianIcon(hasActiveIntervention: boolean, avatarUrl: string | null): L.DivIcon {
  const pulseColor = hasActiveIntervention ? 'rgba(249, 115, 22, 0.4)' : 'rgba(34, 197, 94, 0.4)';
  const borderColor = hasActiveIntervention ? '#f97316' : '#22c55e';
  const src = technicianAvatarUrl(avatarUrl);
  return L.divIcon({
    className: 'technician-marker-photo',
    html: `
      <div style="position: relative; width: 48px; height: 48px;">
        <div style="position: absolute; inset: 0; background: ${pulseColor}; border-radius: 9999px; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 48px; height: 48px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 3px solid ${borderColor}; overflow: hidden; background: white;">
          <img src="${src}" alt="Technicien" style="width: 100%; height: 100%; object-fit: cover;" onerror="if(!this.src.endsWith('${DEFAULT_TECHNICIAN_AVATAR}')){this.src='${DEFAULT_TECHNICIAN_AVATAR}';}" />
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}
