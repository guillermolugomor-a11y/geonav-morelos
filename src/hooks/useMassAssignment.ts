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
  sectionesBase: number;        // average sections per team (display only)
  residuo: number;              // kept for UI compat; always 0 with padrón-weighted distribution
  padronBase: number;           // target padrón per team = totalPadrón / numEquipos
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

// ─── Nearest-Neighbor Linear Chain ───────────────────────────────────────────
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

// Euclidean² distance on raw lat/lon — negligible distortion within one district.
function eucl2(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

// K-Means++ seeding — spreads N starting positions across the territory.
function kmeansInit(coords: [number, number][], k: number): [number, number][] {
  const n = coords.length;
  const seeds: [number, number][] = [coords[Math.floor(Math.random() * n)]];

  while (seeds.length < Math.min(k, n)) {
    const dists = coords.map(c => Math.min(...seeds.map(s => eucl2(c, s))));
    const total = dists.reduce((a, b) => a + b, 0);
    if (total === 0) { seeds.push(coords[seeds.length]); continue; }
    let r = Math.random() * total;
    let chosen = n - 1;
    for (let i = 0; i < n; i++) { r -= dists[i]; if (r <= 0) { chosen = i; break; } }
    seeds.push(coords[chosen]);
  }
  return seeds;
}

// ─── Padrón-Weighted Balanced K-Means ────────────────────────────────────────
//
// Runs Lloyd's K-Means where cluster "full" is defined by a padrón budget
// (total registered voters) rather than a section count. A cluster accepts new
// sections until its accumulated padrón reaches padronTarget; sections are
// processed in regret order (most-contested-geographically first) so peripheral
// sections don't end up assigned to distant clusters just because nearer ones
// filled up.

function balancedKmeansPadron(
  sections: BlockSection[],
  numTeams: number,
  padronTarget: number
): BlockSection[][] {
  const centroids = new Map<number, [number, number]>();
  for (const s of sections) {
    const c = getCentroidMass(s.geometry);
    if (c) centroids.set(s.id, c);
  }
  const withC = sections.filter(s => centroids.has(s.id));
  if (withC.length === 0) return Array.from({ length: numTeams }, () => []);

  const coords = withC.map(s => centroids.get(s.id)!);
  const padrons = withC.map(s => s.total ?? padronTarget / numTeams);
  const kA = Math.min(numTeams, coords.length);

  let centers = kmeansInit(coords, kA);
  let assignments: number[] = new Array(coords.length).fill(0);

  for (let iter = 0; iter < 150; iter++) {
    const padronUsed = new Array(numTeams).fill(0);

    const withRegret = coords.map((coord, i) => {
      const dists = centers.map(c => eucl2(coord, c));
      const sorted = [...dists].sort((a, b) => a - b);
      const regret = sorted.length > 1 ? sorted[1] - sorted[0] : 0;
      return { i, dists, regret };
    });
    withRegret.sort((a, b) => b.regret - a.regret);

    const newAssign: number[] = new Array(coords.length).fill(-1);
    for (const { i, dists } of withRegret) {
      const ranked = dists.map((d, k) => ({ k, d })).sort((a, b) => a.d - b.d);
      let assigned = false;
      for (const { k } of ranked) {
        if (padronUsed[k] < padronTarget) {
          newAssign[i] = k; padronUsed[k] += padrons[i]; assigned = true; break;
        }
      }
      // Fallback: all clusters over budget → assign to nearest
      if (!assigned) { newAssign[i] = ranked[0].k; padronUsed[ranked[0].k] += padrons[i]; }
    }

    const changed = newAssign.some((a, i) => a !== assignments[i]);
    assignments = newAssign;
    if (!changed) break;

    for (let k = 0; k < kA; k++) {
      const pts = coords.filter((_, i) => assignments[i] === k);
      if (!pts.length) {
        let maxD = -1; let fIdx = 0;
        coords.forEach((c, i) => { const d = Math.min(...centers.map(s => eucl2(c, s))); if (d > maxD) { maxD = d; fIdx = i; } });
        centers[k] = coords[fIdx];
      } else {
        centers[k] = [pts.reduce((s, c) => s + c[0], 0) / pts.length, pts.reduce((s, c) => s + c[1], 0) / pts.length];
      }
    }
  }

  const zones: BlockSection[][] = Array.from({ length: numTeams }, () => []);
  withC.forEach((s, i) => { if (assignments[i] >= 0) zones[assignments[i]].push(s); });
  return zones;
}

// ─── Padrón Rebalance ─────────────────────────────────────────────────────────
//
// After K-Means and geo-swap, fine-tunes padrón balance by transferring the
// geographically-nearest section from the most over-budget zone to the most
// under-budget zone. Accepts a transfer only if padrón variance strictly
// decreases. Stops when the max delta between zones is within 3% of target.

function padronRebalance(
  zones: BlockSection[][],
  cm: Map<number, [number, number]>,
  padronTarget: number,
  maxPasses = 80
): BlockSection[][] {
  const zs = zones.map(z => [...z]);

  const zonePadron = (z: BlockSection[]) => z.reduce((s, sec) => s + (sec.total ?? 0), 0);
  const variance = (zs: BlockSection[][]) => {
    const ps = zs.map(z => zonePadron(z));
    const m = ps.reduce((a, b) => a + b, 0) / ps.length;
    return ps.reduce((s, p) => s + (p - m) ** 2, 0) / ps.length;
  };
  const centroidOf = (z: BlockSection[]): [number, number] | null => {
    const cs = z.map(s => cm.get(s.id)).filter(Boolean) as [number, number][];
    if (!cs.length) return null;
    return [cs.reduce((s, c) => s + c[0], 0) / cs.length, cs.reduce((s, c) => s + c[1], 0) / cs.length];
  };

  for (let pass = 0; pass < maxPasses; pass++) {
    const ps = zs.map(z => zonePadron(z));
    const overIdx = ps.indexOf(Math.max(...ps));
    const underIdx = ps.indexOf(Math.min(...ps));
    if (overIdx === underIdx) break;
    if (ps[overIdx] - ps[underIdx] < padronTarget * 0.03) break;

    const underCtr = centroidOf(zs[underIdx]);
    if (!underCtr) break;

    let bestSec: BlockSection | null = null;
    let bestDist = Infinity;
    for (const sec of zs[overIdx]) {
      if (zs[overIdx].length <= 1) break;
      const sc = cm.get(sec.id);
      if (!sc) continue;
      const d = haversineMass(sc, underCtr);
      if (d < bestDist) { bestDist = d; bestSec = sec; }
    }
    if (!bestSec) break;

    const newOver = zs[overIdx].filter(s => s.id !== bestSec!.id);
    const newUnder = [...zs[underIdx], bestSec];
    const tempZs = zs.map((z, i) => i === overIdx ? newOver : i === underIdx ? newUnder : z);
    if (variance(tempZs) < variance(zs)) {
      zs[overIdx] = newOver;
      zs[underIdx] = newUnder;
    } else {
      break;
    }
  }

  return zs;
}

// ─── Swap Optimization ────────────────────────────────────────────────────────
//
// After Balanced K-Means converges, iteratively improves the worst zone by
// swapping one of its sections with a section from any other zone.
// Accept a swap when the worst zone improves AND the receiving zone does not
// become worse than the current worst — effectively leveling outliers.

function avgPairDist(zone: BlockSection[], cm: Map<number, [number, number]>): number {
  const cs = zone.map(s => cm.get(s.id)).filter(Boolean) as [number, number][];
  if (cs.length < 2) return 0;
  let sum = 0; let cnt = 0;
  for (let a = 0; a < cs.length; a++)
    for (let b = a + 1; b < cs.length; b++) { sum += haversineMass(cs[a], cs[b]); cnt++; }
  return sum / cnt;
}

function swapOptimize(zones: BlockSection[][], cm: Map<number, [number, number]>, maxPasses = 40): BlockSection[][] {
  const zs = zones.map(z => [...z]);

  for (let pass = 0; pass < maxPasses; pass++) {
    const dists = zs.map(z => avgPairDist(z, cm));
    const worstIdx = dists.indexOf(Math.max(...dists));
    const worstD = dists[worstIdx];

    let bestGain = -Infinity;
    let bestSwap: { worstIdx: number; zi: number; newWorst: BlockSection[]; newZi: BlockSection[] } | null = null;

    for (const sec of zs[worstIdx]) {
      const withoutSec = zs[worstIdx].filter(s => s.id !== sec.id);
      for (let zi = 0; zi < zs.length; zi++) {
        if (zi === worstIdx) continue;
        for (const candidate of zs[zi]) {
          const newWorst = [...withoutSec, candidate];
          const newZi = zs[zi].filter(s => s.id !== candidate.id).concat([sec]);
          const newWorstD = avgPairDist(newWorst, cm);
          const newZiD = avgPairDist(newZi, cm);
          // Accept: worst zone must shrink, neighbor must not exceed current worst
          if (newWorstD < worstD - 0.05 && newZiD <= worstD) {
            const gain = worstD - newWorstD;
            if (gain > bestGain) { bestGain = gain; bestSwap = { worstIdx, zi, newWorst, newZi }; }
          }
        }
      }
    }

    if (!bestSwap || bestGain < 0.05) break;
    zs[bestSwap.worstIdx] = bestSwap.newWorst;
    zs[bestSwap.zi] = bestSwap.newZi;
  }

  return zs;
}

// ─── Public Algorithm — Multi-start Balanced K-Means + Swap Optimization ──────
//
// Criterio: todos los equipos reciben el mismo número de secciones (floor).
// El residuo (+1) se distribuye entre las primeras zonas (las de mayor población
// una vez formadas). La asignación zona→equipo es determinista por población.
//
// Pasos:
//   1. Balanced K-Means x8 con minimax: corre 8 veces, conserva el run donde
//      el PEOR equipo tiene la distancia promedio mínima (evita outliers extremos
//      por semillas iniciales desafortunadas).
//   2. Swap optimization: intercambia secciones entre el peor equipo y sus
//      vecinos hasta que ningún swap mejore el resultado.
//   3. Ordenar zonas resultantes por población DESC.
//   4. Optimización de ruta dentro de cada zona (vecino más cercano).
//   5. Emparejar zona[i] → equipo[i] (orden determinista por población).

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

  // Edge case: fewer sections than teams → one section per team, rest circular
  if (totalTarget <= numTeams) {
    const simple: PopulationAwareBlock[] = withGeom.slice(0, totalTarget).map((s, i) => ({
      blockId: i, sections: [s], userIds: [], totalPoblacion: s.total ?? 0, isAugmented: false,
    }));
    for (let k = 0; k < numTeams; k++) simple[k % simple.length].userIds.push(userIds[k]);
    return simple;
  }

  // Padrón target: total registered voters divided equally among teams
  const cm = new Map<number, [number, number]>();
  for (const s of withGeom) { const c = getCentroidMass(s.geometry); if (c) cm.set(s.id, c); }

  const totalPadron = withGeom.reduce((s, sec) => s + (sec.total ?? 0), 0);
  const padronTarget = totalPadron > 0 ? totalPadron / numTeams : totalTarget / numTeams;

  // Step 1: Padrón-weighted K-Means x5 — pick run with most compact worst zone (minimax)
  let bestZones: BlockSection[][] | null = null;
  let bestWorst = Infinity;
  for (let run = 0; run < 5; run++) {
    const candidate = balancedKmeansPadron(withGeom, numTeams, padronTarget);
    const worst = Math.max(...candidate.map(z => avgPairDist(z, cm)));
    if (worst < bestWorst) { bestWorst = worst; bestZones = candidate; }
  }

  // Step 2: Geographic swap — reduce dispersion of the worst zone
  const geoSwapped = swapOptimize(bestZones!, cm, 25);

  // Step 3: Padrón rebalance — fine-tune voter count balance between zones
  const grownZones = padronRebalance(geoSwapped, cm, padronTarget, 80);

  // Sort zones by total padrón DESC for deterministic team assignment
  const ranked = grownZones
    .map(zone => ({ zone, totalPop: zone.reduce((s, sec) => s + (sec.total ?? 0), 0) }))
    .sort((a, b) => b.totalPop - a.totalPop);

  // Route-optimize within each zone (nearest-neighbor chain)
  const routedZones = ranked.map(({ zone }) => buildLinearChain(zone));

  // zona[0] (mayor padrón) → equipo[0], zona[N-1] → equipo[N-1]
  return routedZones.map((secs, blockId) => ({
    blockId,
    sections: secs,
    userIds: [userIds[blockId]],
    totalPoblacion: secs.reduce((sum, s) => sum + (s.total ?? 0), 0),
    isAugmented: secs.reduce((sum, s) => sum + (s.total ?? 0), 0) > padronTarget * 1.05,
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

      // Avg sections per team (display only) and padrón target
      const sectionesBase = Math.round(actualSecciones / fieldUsers.length);
      const padronBase = Math.round(
        blocks.reduce((s, b) => s + b.totalPoblacion, 0) / fieldUsers.length
      );

      setResult({
        distrito,
        numEquipos: fieldUsers.length,
        cantidadSecciones: actualSecciones,
        totalAvailable: sections.length,
        blocks,
        sectionesBase,
        residuo: 0,
        padronBase,
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
