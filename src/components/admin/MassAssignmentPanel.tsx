import React, { useMemo, useState } from 'react';
import {
  Zap,
  ChevronDown,
  Loader2,
  Save,
  RotateCcw,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Users,
  LayoutGrid,
  Calendar,
  FileText,
  Hash,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { UsuarioPerfil } from '../../types';
import {
  PopulationAwareBlock,
  MassAssignmentResult,
  BlockSection,
} from '../../hooks/useMassAssignment';

// ─── Team color palette (24 teams) ───────────────────────────────────────────

export const TEAM_COLOR_CLASSES: string[] = [
  'bg-blue-500 text-white',
  'bg-emerald-500 text-white',
  'bg-violet-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-teal-500 text-white',
  'bg-orange-500 text-white',
  'bg-cyan-600 text-white',
  'bg-pink-500 text-white',
  'bg-indigo-500 text-white',
  'bg-lime-600 text-white',
  'bg-red-600 text-white',
  'bg-sky-500 text-white',
  'bg-fuchsia-500 text-white',
  'bg-yellow-600 text-white',
  'bg-green-600 text-white',
  'bg-purple-700 text-white',
  'bg-slate-600 text-white',
  'bg-stone-500 text-white',
  'bg-red-800 text-white',
  'bg-blue-900 text-white',
  'bg-teal-700 text-white',
  'bg-amber-700 text-white',
  'bg-pink-700 text-white',
];

// Ring variants for live-counter dots
const TEAM_RING_CLASSES: string[] = [
  'ring-blue-400',
  'ring-emerald-400',
  'ring-violet-400',
  'ring-amber-400',
  'ring-rose-400',
  'ring-teal-400',
  'ring-orange-400',
  'ring-cyan-500',
  'ring-pink-400',
  'ring-indigo-400',
  'ring-lime-500',
  'ring-red-500',
  'ring-sky-400',
  'ring-fuchsia-400',
  'ring-yellow-500',
  'ring-green-500',
  'ring-purple-600',
  'ring-slate-500',
  'ring-stone-400',
  'ring-red-700',
  'ring-blue-800',
  'ring-teal-600',
  'ring-amber-600',
  'ring-pink-600',
];

// ─── Public helpers (used by left panel in TaskAssignmentForm) ────────────────

export function getUserBlocks(
  userId: string,
  blocks: PopulationAwareBlock[]
): PopulationAwareBlock[] {
  return blocks.filter(b => b.userIds.includes(userId));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MassAssignmentPanelProps {
  distrito: number | string | null;
  zonaLabel?: string;                 // "Distrito" | "Municipio" — etiqueta del selector activo
  seccionesPadron: BlockSection[];    // pre-filtered to distrito/municipio
  usuarios: UsuarioPerfil[];           // all users (admin filter applied internally)
  numEquipos: number;
  setNumEquipos: (n: number) => void;
  equipoInicio: number;
  setEquipoInicio: (n: number) => void;
  cantidadSecciones: number;           // 0 = all
  setCantidadSecciones: (n: number) => void;
  result: MassAssignmentResult | null;
  onCalcular: () => void;
  onReset: () => void;
  instruccion: string;
  setInstruccion: (v: string) => void;
  fechaVencimiento: string;
  setFechaVencimiento: (v: string) => void;
  onGuardar: () => void;
  isSaving: boolean;
  saveMessage: { type: 'success' | 'error'; text: string } | null;
  totalSecciones?: number;  // total del distrito incluyendo ocupadas
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MassAssignmentPanel: React.FC<MassAssignmentPanelProps> = ({
  distrito,
  zonaLabel = 'Distrito',
  seccionesPadron,
  usuarios,
  numEquipos,
  setNumEquipos,
  equipoInicio,
  setEquipoInicio,
  cantidadSecciones,
  setCantidadSecciones,
  result,
  onCalcular,
  onReset,
  instruccion,
  setInstruccion,
  fechaVencimiento,
  setFechaVencimiento,
  onGuardar,
  isSaving,
  saveMessage,
  totalSecciones,
}) => {
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  // Only field workers with a registered email count toward available slots
  const fieldUsers = useMemo(
    () => usuarios.filter(u => u.rol !== 'admin' && !!u.email),
    [usuarios]
  );

  const totalAvailable = seccionesPadron.length; // secciones disponibles (sin tarea activa)
  const numOcupadas = totalSecciones != null ? totalSecciones - totalAvailable : 0;
  const efectivaSecciones =
    cantidadSecciones > 0
      ? Math.min(cantidadSecciones, totalAvailable)
      : totalAvailable;

  // Rango de equipos [equipoDesde, equipoHasta] — 1-indexado sobre fieldUsers
  const maxTeams = fieldUsers.length;
  const equipoDesde = Math.min(Math.max(1, equipoInicio), Math.max(1, maxTeams));
  const equipoHasta = Math.min(equipoDesde + numEquipos - 1, maxTeams);
  const rangeCount = Math.max(0, equipoHasta - equipoDesde + 1);

  // Live preview stats — update instantly as inputs change, before Calcular
  const preview = useMemo(() => {
    const n = efectivaSecciones;
    const t = rangeCount;
    if (t === 0) return null;
    const base = Math.floor(n / t);
    const residuo = n % t;
    const bloques = t;
    return { n, t, base, residuo, bloques };
  }, [efectivaSecciones, rangeCount]);

  const canCalculate =
    distrito !== null &&
    totalAvailable > 0 &&
    rangeCount >= 1 &&
    fieldUsers.length > 0;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/8 border border-primary/15 rounded-2xl">
        <Zap className="w-4 h-4 text-primary shrink-0" />
        <span className="text-[11px] font-black uppercase tracking-widest text-primary">
          Asignación Masiva Automatizada
        </span>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-primary/70 bg-primary/8 px-2 py-0.5 rounded-full">
            {totalAvailable} disponibles
          </span>
          {numOcupadas > 0 && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {numOcupadas} ocupadas
            </span>
          )}
        </div>
      </div>

      {/* ── Step 1: Zona de trabajo (read-only) ── */}
      <div className="space-y-1.5">
        <StepLabel step="1" label={`${zonaLabel} de trabajo`} />
        <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-low border border-primary/5 rounded-xl">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          {distrito === null ? (
            <span className="text-xs font-bold text-amber-600">
              Selecciona un {zonaLabel.toLowerCase()} específico en el selector de arriba
            </span>
          ) : (
            <span className="text-sm font-black text-primary">{zonaLabel} {distrito}</span>
          )}
        </div>
      </div>

      {/* ── Step 2: Rango de equipos (desde–hasta) ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between ml-1">
          <StepLabel step="2" label="Rango de equipos" />
          <span className="text-[10px] font-bold text-stone-400">
            {rangeCount} de {maxTeams} operativos
          </span>
        </div>

        {/* Desde / Hasta selectors */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">
              Equipo desde
            </label>
            <select
              value={equipoDesde}
              disabled={maxTeams === 0}
              onChange={e => setEquipoInicio(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-surface-container-low border border-primary/5 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-black text-stone-700 shadow-inner disabled:opacity-50"
            >
              {Array.from({ length: maxTeams }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Equipo {n}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">
              Equipo hasta
            </label>
            <select
              value={equipoHasta}
              disabled={maxTeams === 0}
              onChange={e => setNumEquipos(Math.max(1, Number(e.target.value) - equipoDesde + 1))}
              className="w-full px-3 py-2.5 bg-surface-container-low border border-primary/5 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-black text-stone-700 shadow-inner disabled:opacity-50"
            >
              {Array.from({ length: Math.max(0, maxTeams - equipoDesde + 1) }, (_, i) => equipoDesde + i).map(n => (
                <option key={n} value={n}>Equipo {n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Team dots */}
        <div className="flex gap-1.5 flex-wrap pt-0.5 pl-0.5">
          {Array.from({ length: rangeCount }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-offset-1 ${TEAM_COLOR_CLASSES[i % TEAM_COLOR_CLASSES.length]} ${TEAM_RING_CLASSES[i % TEAM_RING_CLASSES.length]}`}
            >
              {equipoDesde + i}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 3: Cantidad de secciones a trabajar ── */}
      <div className="space-y-1.5">
        <StepLabel step="3" label="Secciones a trabajar" />
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <input
            type="number"
            min={rangeCount}
            max={totalAvailable}
            value={cantidadSecciones > 0 ? cantidadSecciones : totalAvailable}
            onChange={e => {
              const v = Math.min(totalAvailable, Math.max(rangeCount, Number(e.target.value) || rangeCount));
              setCantidadSecciones(v === totalAvailable ? 0 : v);
            }}
            disabled={distrito === null}
            className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-primary/5 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-black text-stone-700 shadow-inner disabled:opacity-50"
          />
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-stone-400 font-medium">
            mín: {rangeCount} · máx: {totalAvailable} disponibles
          </span>
          {efectivaSecciones < totalAvailable && cantidadSecciones > 0 && (
            <span className="text-[10px] font-black text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {totalAvailable - efectivaSecciones} excluidas
            </span>
          )}
        </div>
        {numOcupadas > 0 && (
          <p className="px-1 text-[10px] text-amber-600 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {numOcupadas} sección{numOcupadas !== 1 ? 'es' : ''} en trabajo activo excluida{numOcupadas !== 1 ? 's' : ''} del algoritmo
          </p>
        )}
      </div>

      {/* ── Step 4: Tamaño de bloque (Advanced) ── */}
      <AdvancedOption
        label="Opciones avanzadas del algoritmo"
        hint="Configuración de clustering geográfico"
      >
        <div className="space-y-2">
          <p className="text-[10px] text-stone-500 font-bold">
            El algoritmo reparte <strong>la misma cantidad de secciones</strong> a cada equipo,
            manteniéndolas geográficamente juntas. Si la cantidad es impar, algunos equipos
            reciben una sección de más.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-primary/5 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-primary">{preview?.base ?? '—'}</p>
              <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Secc. base/eq.</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-emerald-600">{preview?.residuo ? `+1 ×${preview.residuo}` : '—'}</p>
              <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Equipos con extra</p>
            </div>
          </div>
        </div>
      </AdvancedOption>

      {/* ── Live Preview Stats (before Calcular) ── */}
      {!result && preview && distrito !== null && (
        <div className="grid grid-cols-4 gap-1.5 animate-in fade-in duration-200">
          <MiniStat value={preview.bloques} label="Bloques" color="text-primary" bg="bg-primary/5" />
          <MiniStat value={preview.n} label="Secciones" color="text-emerald-600" bg="bg-emerald-50" />
          <MiniStat value={preview.t} label="Equipos" color="text-violet-600" bg="bg-violet-50" />
          <MiniStat value={preview.base} label="Base/Eq." color="text-amber-600" bg="bg-amber-50" />
        </div>
      )}

      {/* ── Calcular button ── */}
      {!result && (
        <button
          type="button"
          onClick={onCalcular}
          disabled={!canCalculate}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <Zap className="w-4 h-4" />
          Calcular Distribución
        </button>
      )}

      {/* ── Result section ── */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Result summary stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <div className="grid grid-cols-4 gap-1.5">
                <MiniStat value={result.blocks.length} label="Bloques" color="text-primary" bg="bg-primary/5" />
                <MiniStat value={result.cantidadSecciones} label="Secciones" color="text-emerald-600" bg="bg-emerald-50" />
                <MiniStat value={result.numEquipos} label="Equipos" color="text-violet-600" bg="bg-violet-50" />
                <MiniStat value={result.sectionesBase} label="Secc. base/Eq." color="text-amber-600" bg="bg-amber-50" />
              </div>
            </div>

            {/* Section-count balance indicator */}
            <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-black text-emerald-700">
                {result.residuo > 0
                  ? `Reparto por secciones — ${result.sectionesBase} por equipo (${result.residuo} equipo${result.residuo !== 1 ? 's' : ''} con 1 extra) · ~${result.padronBase.toLocaleString()} padrones/eq.`
                  : `Reparto por secciones — ${result.sectionesBase} por equipo · ~${result.padronBase.toLocaleString()} padrones/eq.`}
              </span>
            </div>
          </div>

          {/* Block cards */}
          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {result.blocks.map(block => (
              <BlockCard
                key={block.blockId}
                block={block}
                usuarios={usuarios}
                teamColorIdx={block.blockId % TEAM_COLOR_CLASSES.length}
                isExpanded={expandedBlock === block.blockId}
                onToggle={() =>
                  setExpandedBlock(prev =>
                    prev === block.blockId ? null : block.blockId
                  )
                }
              />
            ))}
          </div>

          {/* Recalculate */}
          <button
            type="button"
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-black uppercase tracking-widest text-stone-500 hover:text-primary transition-colors rounded-xl border border-dashed border-stone-300 hover:border-primary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recalcular distribución
          </button>

          {/* Task config section */}
          <div className="space-y-3 border-t border-primary/5 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-70 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Configuración de Tareas
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1">
                Instrucciones *
              </label>
              <textarea
                value={instruccion}
                onChange={e => setInstruccion(e.target.value)}
                placeholder="Instrucciones para todos los equipos en esta jornada..."
                rows={3}
                className="w-full px-4 py-3 bg-surface-container-low border border-primary/5 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium text-stone-700 resize-none shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fecha límite (opcional)
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={e => setFechaVencimiento(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-primary/5 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-stone-700 shadow-inner"
              />
            </div>
          </div>

          {/* Save message */}
          {saveMessage && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl text-xs font-bold ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              {saveMessage.text}
            </div>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={onGuardar}
            disabled={isSaving || !instruccion.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando asignación masiva...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Asignación Masiva
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepLabel({ step, label }: { step: string; label: string }) {
  return (
    <div className="flex items-center gap-2 ml-1">
      <div className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0">
        {step}
      </div>
      <span className="text-[11px] font-black text-on-surface uppercase tracking-widest opacity-75">
        {label}
      </span>
    </div>
  );
}

function MiniStat({
  value,
  label,
  color,
  bg,
}: {
  value: number | string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-2.5 text-center`}>
      <p className={`text-xl font-display font-black ${color}`}>{value}</p>
      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5 leading-tight">
        {label}
      </p>
    </div>
  );
}

function BlockCard({
  block,
  usuarios,
  teamColorIdx,
  isExpanded,
  onToggle,
}: {
  block: PopulationAwareBlock;
  usuarios: UsuarioPerfil[];
  teamColorIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const assignedUser = usuarios.find(u => block.userIds[0] && u.id === block.userIds[0]);
  const colorClass = TEAM_COLOR_CLASSES[teamColorIdx];

  return (
    <div
      className={`rounded-2xl overflow-hidden border ${
        block.isAugmented ? 'border-amber-300 bg-amber-50/30' : 'border-primary/5 bg-surface-container-low'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/40 transition-colors text-left"
      >
        {/* Team avatar */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${colorClass}`}
        >
          {assignedUser ? assignedUser.nombre.charAt(0) : <LayoutGrid className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-black text-on-surface truncate">
              {assignedUser?.nombre ?? `Equipo ${block.blockId + 1}`}
            </p>
            {block.isAugmented && (
              <span className="text-[8px] font-black bg-amber-400 text-white px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                +1 sec
              </span>
            )}
          </div>
          <p className="text-[10px] text-stone-400 font-bold">
            {block.sections.length} secciones
            {block.totalPoblacion > 0 && (
              <> · {block.totalPoblacion.toLocaleString()} padrones</>
            )}
          </p>
        </div>

        {/* Section chips preview */}
        <div className="flex gap-1 shrink-0">
          {block.sections.slice(0, 3).map(s => (
            <span
              key={s.id}
              className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-md"
            >
              {s.id}
            </span>
          ))}
          {block.sections.length > 3 && (
            <span className="text-[9px] font-black bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded-md">
              +{block.sections.length - 3}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-primary/5 pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Population bar */}
          {block.totalPoblacion > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-primary shrink-0" />
              <span className="text-[10px] font-black text-stone-500">
                {block.totalPoblacion.toLocaleString()} padrones en zona
              </span>
              {block.isAugmented && (
                <span className="text-[9px] text-amber-600 font-black bg-amber-100 px-1.5 py-0.5 rounded-full ml-auto">
                  +1 sección extra
                </span>
              )}
            </div>
          )}

          {/* Section chips full */}
          <div className="flex flex-wrap gap-1.5">
            {block.sections.map(s => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 text-[10px] font-black bg-primary text-white px-2.5 py-1 rounded-full"
              >
                <MapPin className="w-2.5 h-2.5" />
                S-{s.id}
                {s.total !== undefined && (
                  <span className="opacity-70 font-medium text-[9px]">
                    ({s.total.toLocaleString()})
                  </span>
                )}
              </span>
            ))}
          </div>

          {/* Users */}
          {block.userIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {block.userIds.map((uid, i) => {
                const u = usuarios.find(x => x.id === uid);
                return (
                  <span
                    key={uid}
                    className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${TEAM_COLOR_CLASSES[(teamColorIdx + i) % TEAM_COLOR_CLASSES.length]}`}
                  >
                    <Users className="w-2.5 h-2.5" />
                    {u?.nombre ?? uid.slice(0, 8)}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdvancedOption({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-dashed border-stone-300 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-stone-50 transition-colors"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 text-left">
            {label}
          </p>
          <p className="text-[9px] text-stone-400 font-medium text-left">{hint}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-stone-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}
