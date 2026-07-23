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
  distrito: number | string;   // número de distrito o nombre de municipio, según la zona de trabajo
  numEquipos: number;
  cantidadSecciones: number;   // sections actually worked
  totalAvailable: number;       // total sections in distrito/municipio
  blocks: PopulationAwareBlock[];
  sectionesBase: number;        // secciones base por equipo (floor de totalSecciones / numEquipos)
  residuo: number;              // # de equipos que reciben una sección extra (totalSecciones % numEquipos)
  padronBase: number;           // padrón promedio por equipo (solo informativo; ya no dirige el reparto)
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
// Chains sections by proximity starting from a given anchor (or the
// westernmost section by default). Result: block N is always geographically
// adjacent to block N+1.

function buildLinearChain(sections: BlockSection[], startOverride?: BlockSection): BlockSection[] {
  const centroids = new Map<number, [number, number]>();
  for (const s of sections) {
    const c = getCentroidMass(s.geometry);
    if (c) centroids.set(s.id, c);
  }

  const withCentroids = sections.filter(s => centroids.has(s.id));
  if (withCentroids.length === 0) return sections;

  // Westernmost section as default starting anchor for a deterministic traversal
  const start = startOverride ?? withCentroids.reduce((best, s) =>
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

// Diámetro máximo entre cualquier par de secciones dentro de una misma zona —
// usado para comparar qué punto de anclaje de la cadena produce el equipo
// menos disperso.
function zoneMaxDiameter(zone: BlockSection[], cm: Map<number, [number, number]>): number {
  const coords = zone.map(s => cm.get(s.id)).filter(Boolean) as [number, number][];
  let worst = 0;
  for (let i = 0; i < coords.length; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      const d = haversineMass(coords[i], coords[j]);
      if (d > worst) worst = d;
    }
  }
  return worst;
}

// Máximo de candidatos de anclaje a probar — acota el costo O(n²) por
// candidato a un total manejable incluso para el municipio más grande.
const MAX_CHAIN_START_CANDIDATES = 80;

// ─── Public Algorithm — Chain-Cut ──────────────────────────────────────────────
//
// Criterio: todos los equipos reciben el mismo número de secciones (floor).
// El residuo (+1) se distribuye entre algunos equipos hasta agotarse. El
// padrón electoral ya no dirige el reparto, solo se reporta como información
// complementaria.
//
// Contigüidad por construcción: en vez de agrupar por K-Means (que balancea
// bien la cantidad pero puede necesitar "rescatar" secciones sueltas de zonas
// lejanas para cuadrar el conteo exacto — dejando outliers dispersos cuando la
// densidad no es uniforme), se recorre TODO el territorio disponible con una
// sola cadena de vecino-más-cercano y se corta en tramos consecutivos del
// tamaño exacto de cada equipo. Un equipo solo "cruza" de un pueblo/zona a
// otra si su tramo cae justo en el límite entre ambos — nunca varios equipos
// sueltos al azar. Nota: NO se aplica un swap "global" de compactación después
// del corte — probado en la práctica, ese pulido usaba el peor equipo del
// momento como referencia y terminaba inyectando outliers en equipos que ya
// estaban perfectamente compactos, exactamente el problema que se buscaba
// evitar. El corte en cadena por sí solo ya minimiza los cruces de límite al
// mínimo matemáticamente inevitable.
//
// Multi-start: empezar siempre desde el punto más al oeste es determinista
// pero arbitrario — en un territorio con núcleos de población separados
// (común en municipios rurales) el corte forzoso en el límite entre ellos
// puede caer en un punto mucho peor que si la cadena empezara en otro lado.
// Se prueban varios anclajes (acotado a MAX_CHAIN_START_CANDIDATES para
// territorios grandes) y se conserva el que produce el equipo menos disperso.
//
// Pasos:
//   1. Probar varios anclajes de cadena de vecino-más-cercano sobre las
//      secciones disponibles (o las primeras `cantidadSecciones` de cada
//      cadena, si se pidieron menos de las disponibles) y quedarse con el que
//      minimiza el diámetro máximo de cualquier equipo.
//   2. Cortar la cadena elegida en tramos consecutivos según la capacidad de
//      cada equipo (base o base+1).
//   3. Optimización de ruta dentro de cada zona (vecino más cercano).

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

  // Secciones base por equipo y residuo (equipos que reciben +1 sección)
  const base = Math.floor(totalTarget / numTeams);
  const residuo = totalTarget - base * numTeams;
  const capacities = Array.from({ length: numTeams }, (_, i) => (i < residuo ? base + 1 : base));

  const cutIntoZones = (chain: BlockSection[]): BlockSection[][] => {
    const zs: BlockSection[][] = [];
    let cursor = 0;
    for (const cap of capacities) {
      zs.push(chain.slice(cursor, cursor + cap));
      cursor += cap;
    }
    return zs;
  };

  // Step 1: probar varios anclajes para la cadena de vecino-más-cercano y
  // conservar el que produce el equipo menos disperso (menor diámetro máximo).
  const candidates = withGeom.length > MAX_CHAIN_START_CANDIDATES
    ? withGeom.filter((_, i) => i % Math.ceil(withGeom.length / MAX_CHAIN_START_CANDIDATES) === 0)
    : withGeom;

  let bestZones: BlockSection[][] | null = null;
  let bestScore = Infinity;
  for (const startCandidate of candidates) {
    const chain = buildLinearChain(withGeom, startCandidate).slice(0, totalTarget);
    const cm = new Map<number, [number, number]>();
    for (const s of chain) { const c = getCentroidMass(s.geometry); if (c) cm.set(s.id, c); }

    const candidateZones = cutIntoZones(chain);
    const score = Math.max(...candidateZones.map(z => zoneMaxDiameter(z, cm)));
    if (score < bestScore) { bestScore = score; bestZones = candidateZones; }
  }

  // Step 2: ruta óptima dentro de cada zona (vecino más cercano) — solo
  // reordena el recorrido de visita, no cambia qué secciones tiene cada equipo
  const routedZones = bestZones!.map(zone => buildLinearChain(zone));

  return routedZones.map((secs, blockId) => ({
    blockId,
    sections: secs,
    userIds: [userIds[blockId]],
    totalPoblacion: secs.reduce((sum, s) => sum + (s.total ?? 0), 0),
    isAugmented: secs.length > base,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMassAssignment() {
  const [numEquipos, setNumEquipos] = useState<number>(7);
  // Equipo (1-indexado, tras ordenar alfabéticamente) desde el cual empezar
  // a repartir — permite saltar equipos ya ocupados en otra jornada.
  const [equipoInicio, setEquipoInicio] = useState<number>(1);
  // 0 = "use all available sections"
  const [cantidadSecciones, setCantidadSecciones] = useState<number>(0);
  const [result, setResult] = useState<MassAssignmentResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const calcular = useCallback(
    (sections: BlockSection[], usuarios: UsuarioPerfil[], distrito: number | string) => {
      if (!sections.length || !usuarios.length) return;

      // Business rule: exclude admin/test accounts — only field teams, sorted 1→N
      const allFieldUsers = usuarios
        .filter(u => u.rol !== 'admin')
        .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }));

      // Rango [equipoInicio, equipoInicio + numEquipos - 1] — permite arrancar
      // el reparto en un equipo distinto al #1 (p. ej. para no tocar equipos
      // ya asignados en otra jornada del mismo día).
      const startIdx = Math.min(Math.max(equipoInicio - 1, 0), Math.max(allFieldUsers.length - 1, 0));
      const fieldUsers = allFieldUsers.slice(startIdx, startIdx + numEquipos);

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

      // Secciones base por equipo (floor) y residuo (equipos con +1 sección)
      const sectionesBase = Math.floor(actualSecciones / fieldUsers.length);
      const residuo = actualSecciones - sectionesBase * fieldUsers.length;
      // Padrón promedio por equipo — solo informativo, ya no dirige el reparto
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
        residuo,
        padronBase,
      });
      setSaveMessage(null);
    },
    [numEquipos, equipoInicio, cantidadSecciones]
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
    equipoInicio,
    setEquipoInicio,
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
