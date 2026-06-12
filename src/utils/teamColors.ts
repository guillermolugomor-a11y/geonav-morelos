import { PopulationAwareBlock } from '../hooks/useMassAssignment';

// Hex equivalents of TEAM_COLOR_CLASSES in MassAssignmentPanel.tsx
// Index 0 = Equipo 1 (blockId 0), index 13 = Equipo 14 (blockId 13)
export const TEAM_HEX_COLORS: string[] = [
  '#3b82f6', // Equipo 1  — blue-500
  '#10b981', // Equipo 2  — emerald-500
  '#8b5cf6', // Equipo 3  — violet-500
  '#f59e0b', // Equipo 4  — amber-500
  '#f43f5e', // Equipo 5  — rose-500
  '#14b8a6', // Equipo 6  — teal-500
  '#f97316', // Equipo 7  — orange-500
  '#0891b2', // Equipo 8  — cyan-600
  '#ec4899', // Equipo 9  — pink-500
  '#6366f1', // Equipo 10 — indigo-500
  '#65a30d', // Equipo 11 — lime-600
  '#dc2626', // Equipo 12 — red-600
  '#0ea5e9', // Equipo 13 — sky-500
  '#d946ef', // Equipo 14 — fuchsia-500
];

export function getColorPorEquipo(blockId: number): string {
  return TEAM_HEX_COLORS[blockId % TEAM_HEX_COLORS.length];
}

// Map<sectionId, hexColor> — consumed by MassAssignmentLayer style function
export function buildSectionColorMap(blocks: PopulationAwareBlock[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const block of blocks) {
    const color = TEAM_HEX_COLORS[block.blockId % TEAM_HEX_COLORS.length];
    for (const section of block.sections) {
      map.set(section.id, color);
    }
  }
  return map;
}

// Map<userId, hexColor> — consumed by MassFilterControl to show team colors
export function buildUserColorMap(blocks: PopulationAwareBlock[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const block of blocks) {
    const color = TEAM_HEX_COLORS[block.blockId % TEAM_HEX_COLORS.length];
    for (const userId of block.userIds) {
      map.set(userId, color);
    }
  }
  return map;
}
