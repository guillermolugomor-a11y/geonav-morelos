import { useState, useCallback } from 'react';
import { UsuarioPerfil } from '../types';
import { taskService } from '../services/taskService';
import { buildTaskPayload } from '../utils/taskPayload';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlockSection {
  id: number;
  total?: number; // padrón population count from GeoJSON
  geometry?: any;
}

export interface PopulationAwareBlock {
  blockId: number;
  sections: BlockSection[];
  userIds: string[];
  totalPoblacion: number; // sum of section.total for all sections in block
  isAugmented: boolean;   // received an extra "residuo" section
}

export interface MassAssignmentResult {
  distrito: number;
  numEquipos: number;
  cantidadSecciones: number;   // sections actually worked
  totalAvailable: number;       // total sections in distrito
  blocks: PopulationAwareBlock[];
  sectionesBase: number;        // Math.floor(cantidadSecciones / numEquipos)
  residuo: number;              // cantidadSecciones % numEquipos
}

// ─── Geo Utilities ────────────────────────────────────────────────────────────

function getCentroidMass(geometry: any): [number, number] | null {
  if (!geometry) return null;
  let coords: any[] = [];
  if (geometry.type === 'Polygon') coords = geometry.coordinates[0];
  else if (geometry.type === 'MultiPolygon') coords = geometry.coordinates.flatMap((p: any) => p[0]);
  else if (geometry.type === 'Point') coords = [geometry.coordinates];
  else return null;
  if (!coords.length) return null;
  let x = 0, y = 0;
  coords.forEach((c: any) => { x += c[0]; y += c[1]; });
  return [x / coords.length, y / coords.length];
}

function haversineMass(c1: [number, number], c2: [number, number]): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(c2[1] - c1[1]);
  const dLon = toRad(c2[0] - c1[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1[1])) * Math.cos(toRad(c2[1])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Centroide promedio de una zona (lon, lat)
function zoneCentroid(zone: BlockSection[]): [number, number] | null {
  const cs = zone.map(s => getCentroidMass(s.geometry)).filter(Boolean) as [number, number][];
  if (!cs.length) return null;
  return [
    cs.reduce((s, c) => s + c[0], 0) / cs.length,
    cs.reduce((s, c) => s + c[1], 0) / cs.length,
  ];
}

// ─── Step 1: Nearest-Neighbor Linear Chain ────────────────────────────────────
// Anchors at the westernmost section and chains sections by proximity.
// Result: block N is always geographically adjacent to block N+1.

function buildLinearChain(sections: BlockSection[]): BlockSection[] {
  const centroids = new Map<number, [number, number]>();
  for (const s of sections) {
    const c = getCentroidMass(s.geometry);
    if (c) centroids.set(s.id, c);
  }

  const withCentroids = sections.filter(s => centroids.has(s.id));
  if (withCentroids.length === 0) return sections;

  // Westernmost section as starting anchor for a deterministic traversal
  const start = withCentroids.reduce((best, s) =>
    centroids.get(s.id)![0] < centroids.get(best.id)![0] ? s : best
  );

  const visited = new Set<number>([start.id]);
  const chain: BlockSection[] = [start];

  while (chain.length < withCentroids.length) {
    const lastC = centroids.get(chain[chain.length - 1].id)!;
    let nearestDist = Infinity;
    let nearest: BlockSection | null = null;

    for (const s of withCentroids) {
      if (visited.has(s.id)) continue;
      const dist = haversineMass(lastC, centroids.get(s.id)!);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = s;
      }
    }

    if (!nearest) break;
    visited.add(nearest.id);
    chain.push(nearest);
  }

  return chain;
}

// ─── K-Means Geographic Clustering ───────────────────────────────────────────
//
// We use Euclidean² on raw lat/lon for all K-Means distance comparisons.
// Within a single municipality the projection distortion is negligible and
// Euclidean is ~10× faster than Haversine for the iteration inner loop.
// Haversine is used only for the final route-optimization step.

function eucl2(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

// K-Means++ seeding: each successive seed is chosen with probability ∝ D(x)²,
// the squared distance to the nearest already-chosen seed.  This spreads the
// initial centroids across the territory and reduces bad-convergence runs.
function kmeansInit(coords: [number, number][], k: number): [number, number][] {
  const n = coords.length;
  const seeds: [number, number][] = [coords[Math.floor(Math.random() * n)]];

  while (seeds.length < Math.min(k, n)) {
    const dists = coords.map(c => Math.min(...seeds.map(s => eucl2(c, s))));
    const total = dists.reduce((a, b) => a + b, 0);

    if (total === 0) { seeds.push(coords[seeds.length]); continue; }

    let r = Math.random() * total;
    let chosen = n - 1;
    for (let i = 0; i < n; i++) {
      r -= dists[i];
      if (r <= 0) { chosen = i; break; }
    }
    seeds.push(coords[chosen]);
  }

  return seeds;
}

// Lloyd's algorithm with K-Means++ init.  Empty clusters are re-seeded at the
// point farthest from all current centroids to avoid degenerate partitions.
function kmeansCluster(sections: BlockSection[], k: number, maxIter = 150): number[] {
  const rawCentroids = sections.map(s => getCentroidMass(s.geometry));
  const validIdx = sections.map((_, i) => i).filter(i => rawCentroids[i] !== null);
  const coords = validIdx.map(i => rawCentroids[i] as [number, number]);

  if (coords.length === 0) return sections.map(() => 0);

  const kActual = Math.min(k, coords.length);
  let seeds = kmeansInit(coords, kActual);
  let assignments = new Array(coords.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assignment step
    const next = coords.map(c => {
      let minD = Infinity, minK = 0;
      for (let ki = 0; ki < seeds.length; ki++) {
        const d = eucl2(c, seeds[ki]);
        if (d < minD) { minD = d; minK = ki; }
      }
      return minK;
    });

    const changed = next.some((a, i) => a !== assignments[i]);
    assignments = next;
    if (!changed) break;

    // Update step
    for (let ki = 0; ki < kActual; ki++) {
      const pts = coords.filter((_, i) => assignments[i] === ki);
      if (pts.length === 0) {
        // Re-seed at farthest point from all centroids
        let maxD = -1, fIdx = 0;
        coords.forEach((c, i) => {
          const d = Math.min(...seeds.map(s => eucl2(c, s)));
          if (d > maxD) { maxD = d; fIdx = i; }
        });
        seeds[ki] = coords[fIdx];
      } else {
        seeds[ki] = [
          pts.reduce((s, c) => s + c[0], 0) / pts.length,
          pts.reduce((s, c) => s + c[1], 0) / pts.length,
        ];
      }
    }
  }

  // Map assignments back to original section indices (sections with no geometry → cluster 0)
  const result = new Array(sections.length).fill(0);
  validIdx.forEach((origIdx, coordIdx) => { result[origIdx] = assignments[coordIdx]; });
  return result;
}

// Keep only the `targetSize` most-central sections of a zone (closest to zone centroid).
// This trims oversized zones while preserving geographic compactness.
function trimZoneToCentral(zone: BlockSection[], targetSize: number): BlockSection[] {
  if (zone.length <= targetSize) return zone;

  const cs = zone.map(s => getCentroidMass(s.geometry)).filter(Boolean) as [number, number][];
  if (cs.length === 0) return zone.slice(0, targetSize);

  const centroid: [number, number] = [
    cs.reduce((s, c) => s + c[0], 0) / cs.length,
    cs.reduce((s, c) => s + c[1], 0) / cs.length,
  ];

  return zone
    .map(s => {
      const c = getCentroidMass(s.geometry);
      return { s, d: c ? eucl2(c, centroid) : Infinity };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, targetSize)
    .map(x => x.s);
}

// ─── Public Algorithm — Equal Sections + Population-Ordered Assignment ────────
//
// Criterio: todos los equipos reciben el mismo número de secciones (floor).
// El residuo (+1) se asigna a las zonas con MAYOR población total, asegurando
// que los equipos con más secciones cubran el territorio más densamente poblado.
// La asignación zona→equipo es determinista (sin aleatoriedad):
//   zona[0] (más población) → equipo[0] (Equipo 1, "más completo")
//   zona[N-1] (menos población) → equipo[N-1] (Equipo N, "más pequeño")
//
// Garantía de total exacto: recuperación de déficit desde pool global.
//
// Pasos:
//   1. K-Means++ → N zonas geográficamente compactas.
//   2. Ordenar zonas por población DESC.
//   3. Asignar targets iguales; primer `residuo` zonas reciben floor+1.
//   4. Recortar cada zona a su target (secciones más centrales).
//   5. Recuperación de déficit: rellenar con secciones cercanas del pool global.
//   6. Optimización de ruta dentro de cada zona (vecino más cercano).
//   7. Emparejar zona[i] → equipo[i] (orden determinista por población).

export function runMassAssignmentAlgorithmV2(
  sections: BlockSection[],
  userIds: string[],
  cantidadSecciones: number
): PopulationAwareBlock[] {
  const numTeams = userIds.length;
  if (!sections.length || !numTeams || cantidadSecciones <= 0) return [];

  const withGeom = sections.filter(s => getCentroidMass(s.geometry) !== null);
  if (withGeom.length === 0) return [];

  const totalTarget = Math.min(cantidadSecciones, withGeom.length);

  // Edge case: fewer sections than teams → circular overlap
  if (totalTarget <= numTeams) {
    const simple: PopulationAwareBlock[] = withGeom.slice(0, totalTarget).map((s, i) => ({
      blockId: i, sections: [s], userIds: [], totalPoblacion: s.total ?? 0, isAugmented: false,
    }));
    for (let k = 0; k < numTeams; k++) simple[k % simple.length].userIds.push(userIds[k]);
    return simple;
  }

  // Step 1: K-Means geographic clustering → N compact zones
  const clusterOf = kmeansCluster(withGeom, numTeams);
  const rawZones: BlockSection[][] = Array.from({ length: numTeams }, () => []);
  withGeom.forEach((s, i) => rawZones[clusterOf[i] % numTeams].push(s));

  // Step 2: Sort zones by total population DESC
  // Higher-population zones receive the residuo (+1 section).
  const baseSize = Math.floor(totalTarget / numTeams);
  const residuo  = totalTarget % numTeams;

  const ranked = rawZones
    .map(zone => ({
      zone,
      totalPop: zone.reduce((s, sec) => s + (sec.total ?? 0), 0),
    }))
    .sort((a, b) => b.totalPop - a.totalPop);

  // Step 3: Targets — first `residuo` zones (highest pop) get baseSize+1
  const targets = ranked.map((_, i) => baseSize + (i < residuo ? 1 : 0));

  // Step 4: Trim each zone to its target (keep most-central sections)
  const trimmedZones = ranked.map(({ zone }, i) => trimZoneToCentral(zone, targets[i]));

  // Step 5: Deficit recovery — guarantee exactly totalTarget sections are assigned
  const assignedIds = new Set(trimmedZones.flat().map(s => s.id));
  const pool        = withGeom.filter(s => !assignedIds.has(s.id));
  let deficit       = totalTarget - trimmedZones.reduce((s, z) => s + z.length, 0);

  for (let zi = 0; zi < numTeams && deficit > 0; zi++) {
    const shortage = targets[zi] - trimmedZones[zi].length;
    if (shortage <= 0) continue;

    const c = zoneCentroid(trimmedZones[zi].length > 0 ? trimmedZones[zi] : ranked[zi].zone);
    const sorted = c
      ? [...pool].sort((a, b) => {
          const ca = getCentroidMass(a.geometry)!;
          const cb = getCentroidMass(b.geometry)!;
          return eucl2(ca, c) - eucl2(cb, c);
        })
      : [...pool];

    const toAdd = sorted.slice(0, Math.min(shortage, deficit));
    toAdd.forEach(s => {
      trimmedZones[zi].push(s);
      pool.splice(pool.findIndex(p => p.id === s.id), 1);
    });
    deficit -= toAdd.length;
  }

  // Step 6: Route-optimize within each zone (nearest-neighbor chain)
  const routedZones = trimmedZones.map(zone => buildLinearChain(zone));

  // Step 7: Deterministic zone→team pairing by population order (no shuffle)
  // ranked[0] = highest-pop zone → userIds[0] (Equipo 1, "más completo")
  // ranked[N-1] = lowest-pop zone → userIds[N-1] (Equipo N, "más pequeño")
  return routedZones.map((secs, blockId) => ({
    blockId,
    sections: secs,
    userIds: [userIds[blockId]],
    totalPoblacion: secs.reduce((sum, s) => sum + (s.total ?? 0), 0),
    isAugmented: secs.length > baseSize,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMassAssignment() {
  const [numEquipos, setNumEquipos] = useState<number>(7);
  // 0 = "use all available sections"
  const [cantidadSecciones, setCantidadSecciones] = useState<number>(0);
  const [result, setResult] = useState<MassAssignmentResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const calcular = useCallback(
    (sections: BlockSection[], usuarios: UsuarioPerfil[], distrito: number) => {
      if (!sections.length || !usuarios.length) return;

      // Business rule: exclude admin/test accounts — only field teams, sorted 1→14
      const fieldUsers = usuarios
        .filter(u => u.rol !== 'admin')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }))
        .slice(0, numEquipos);

      if (fieldUsers.length === 0) return;

      // Resolve actual cantidadSecciones (0 → use all)
      const actualSecciones =
        cantidadSecciones > 0
          ? Math.min(cantidadSecciones, sections.length)
          : sections.length;

      const blocks = runMassAssignmentAlgorithmV2(
        sections,
        fieldUsers.map(u => u.id),
        actualSecciones
      );

      const sectionesBase = Math.floor(actualSecciones / fieldUsers.length);
      const residuo = actualSecciones % fieldUsers.length;

      setResult({
        distrito,
        numEquipos: fieldUsers.length,
        cantidadSecciones: actualSecciones,
        totalAvailable: sections.length,
        blocks,
        sectionesBase,
        residuo,
      });
      setSaveMessage(null);
    },
    [numEquipos, cantidadSecciones]
  );

  const guardar = useCallback(
    async (
      blocks: PopulationAwareBlock[],
      instruccion: string,
      fechaLimite: string | null,
      adminId?: string,
      fechaOperacion?: string
    ): Promise<boolean> => {
      if (!instruccion.trim()) {
        setSaveMessage({ type: 'error', text: 'Escribe las instrucciones antes de guardar.' });
        return false;
      }

      setIsSaving(true);
      setSaveMessage(null);

      const operacion = fechaOperacion || new Date().toISOString().split('T')[0];
      const payloads: any[] = [];
      for (const block of blocks) {
        for (const userId of block.userIds) {
          for (const section of block.sections) {
            payloads.push(
              buildTaskPayload({
                userId,
                polygonId: section.id,
                instruccion,
                tipoCapa: 'padron',
                fechaLimite: fechaLimite || null,
                selectedSection: { id: section.id },
                fechaOperacion: operacion,
              })
            );
          }
        }
      }

      try {
        const { error } = await taskService.asignarTareasMasivas(payloads, adminId);
        if (error) throw error;
        setSaveMessage({
          type: 'success',
          text: `${payloads.length} tareas asignadas en ${blocks.length} bloques geográficos.`,
        });
        return true;
      } catch (err: any) {
        setSaveMessage({ type: 'error', text: `Error al guardar: ${err.message}` });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setSaveMessage(null);
  }, []);

  return {
    numEquipos,
    setNumEquipos,
    cantidadSecciones,
    setCantidadSecciones,
    result,
    calcular,
    guardar,
    reset,
    isSaving,
    saveMessage,
    setSaveMessage,
  };
}
