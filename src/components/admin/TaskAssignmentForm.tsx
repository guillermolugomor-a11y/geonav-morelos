import React from 'react';
import { ClipboardList, Map as MapIcon, MapPin, Send, User, ChevronDown, ChevronRight, Clock, Users, AlertTriangle, Info, Award, CheckSquare, X } from 'lucide-react';
import { UsuarioPerfil, Tarea } from '../../types';
import { AdminMessage } from './AdminMessage';
import { MiniMap } from './MiniMap';

interface SectionItem {
  id: number | string;
  total?: number;
  geometry?: any;
  distance?: number;
}

interface ManzanaItem {
  id: number | string;
  seccion: number | string;
  manzana: number | string;
  rank_near?: number;
}

interface TaskAssignmentFormProps {
  usuarios: UsuarioPerfil[];
  poligonos: Array<{ id: number; nombre: string; municipio: string; metadata?: { seccion?: string | number } }>;
  selectedUsers: string[];
  setSelectedUsers: (users: string[]) => void;
  selectedPoligono: string;
  setSelectedPoligono: (value: string) => void;
  fechaVencimiento: string;
  setFechaVencimiento: (value: string) => void;
  instruccion: string;
  setInstruccion: (value: string) => void;
  scheduledAt: string;
  setScheduledAt: (value: string) => void;
  autoActivate: boolean;
  setAutoActivate: (value: boolean) => void;
  isCollaborative: boolean;
  setIsCollaborative: (value: boolean) => void;
  seccionesPadron: SectionItem[];
  searchTermPadron: string;
  setSearchTermPadron: (value: string) => void;
  manzanasPadron: ManzanaItem[];
  expandedSection: number | null;
  setExpandedSection: (value: number | null) => void;
  selectedManzana: ManzanaItem | null;
  setSelectedManzana: (value: ManzanaItem | null) => void;
  // Multi-selección de secciones
  selectedSections: SectionItem[];
  setSelectedSections: (value: SectionItem[]) => void;
  selectionMode: 'manual' | 'automatic';
  setSelectionMode: (value: 'manual' | 'automatic') => void;
  autoOriginSectionId: string;
  setAutoOriginSectionId: (value: string) => void;
  autoSelectionCount: number;
  setAutoSelectionCount: (value: number) => void;
  tipoCapa: string;
  submitting: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  onSubmit: (e: React.FormEvent) => void;
  manzanasPorSeccion?: Map<number, ManzanaItem[]>;
  userWorkload?: Map<string, number>;
  userExperienceMap?: Map<string, number>;
  duplicateTask?: Tarea;
  selectedGeometry?: any;
  seccionesCercanas?: any[];
  selectedMunicipioTrabajo: string;
  setSelectedMunicipioTrabajo: (value: string) => void;
}

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const TaskAssignmentForm: React.FC<TaskAssignmentFormProps> = React.memo(({
  usuarios,
  poligonos,
  selectedUsers,
  setSelectedUsers,
  selectedPoligono,
  setSelectedPoligono,
  fechaVencimiento,
  setFechaVencimiento,
  instruccion,
  setInstruccion,
  scheduledAt,
  setScheduledAt,
  autoActivate,
  setAutoActivate,
  isCollaborative,
  setIsCollaborative,
  seccionesPadron,
  searchTermPadron,
  setSearchTermPadron,
  manzanasPadron,
  expandedSection,
  setExpandedSection,
  selectedManzana,
  setSelectedManzana,
  selectedSections,
  setSelectedSections,
  selectionMode,
  setSelectionMode,
  autoOriginSectionId,
  setAutoOriginSectionId,
  autoSelectionCount,
  setAutoSelectionCount,
  seccionesCercanas = [],
  selectedMunicipioTrabajo,
  setSelectedMunicipioTrabajo,
  tipoCapa,
  submitting,
  message,
  onSubmit,
  manzanasPorSeccion,
  userWorkload = new Map(),
  userExperienceMap = new Map(),
  duplicateTask,
  selectedGeometry
}) => {
  const getUsername = (id: string) => usuarios.find(u => u.id === id)?.nombre || 'Desconocido';
  const [searchUserQuery, setSearchUserQuery] = React.useState('');

  const sortedAndFilteredUsuarios = React.useMemo(() => {
    const filtered = usuarios.filter(u => 
      u.nombre.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      (u.rol === 'admin' ? 'administrador' : 'supervisor de campo').toLowerCase().includes(searchUserQuery.toLowerCase())
    );
    return filtered.sort((a, b) => 
      a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [usuarios, searchUserQuery]);

  // Sección primaria para referencias en el combo de colindantes
  const primarySection = selectedSections[0] ?? null;
  const isMultiSection = selectedSections.length > 1;

  // Helpers de multi-selección
  const isSectionSelected = (s: SectionItem) =>
    selectedSections.some(sel => Number(sel.id) === Number(s.id));

  const toggleSection = (s: SectionItem) => {
    if (isSectionSelected(s)) {
      const next = selectedSections.filter(sel => Number(sel.id) !== Number(s.id));
      setSelectedSections(next);
      // Actualizar polygon y manzana al deseleccionar
      if (next.length > 0) {
        setSelectedPoligono(String(next[0].id));
      } else {
        setSelectedPoligono('');
        setSelectedManzana(null);
      }
    } else {
      const next = [...selectedSections, s];
      setSelectedSections(next);
      setSelectedPoligono(String(next[0].id));
      // Con multi-sección limpiamos la manzana
      if (next.length > 1) setSelectedManzana(null);
    }
  };
  return (
    <>
      <div className="p-6 md:p-8 bg-surface border-b border-primary/5">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-primary flex items-center gap-3 tracking-tight">
          <ClipboardList className="w-8 h-8" />
          Gestión de Tareas
        </h2>
        <p className="text-base text-stone-500 mt-2 font-medium">Asigna polígonos y tareas específicas a los supervisores de campo.</p>
      </div>

      <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-8 bg-surface">
        <AdminMessage message={message} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2 opacity-85">
                  <User className="w-4 h-4" /> Supervisores de Campo
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const filteredIds = sortedAndFilteredUsuarios.map(u => u.id);
                    const allFilteredSelected = filteredIds.every(id => selectedUsers.includes(id));
                    if (allFilteredSelected) {
                      setSelectedUsers(selectedUsers.filter(id => !filteredIds.includes(id)));
                    } else {
                      setSelectedUsers(Array.from(new Set([...selectedUsers, ...filteredIds])));
                    }
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors bg-primary/5 px-3 py-1.5 rounded-lg"
                >
                  {sortedAndFilteredUsuarios.length > 0 &&
                  sortedAndFilteredUsuarios.every(u => selectedUsers.includes(u.id))
                    ? 'Desmarcar Todos'
                    : 'Seleccionar Todos'}
                </button>
              </div>

              {/* Cuadro de búsqueda rápida */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar supervisor..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-primary/5 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-bold shadow-inner"
                />
                {searchUserQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchUserQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-primary text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div className="bg-surface-container-low rounded-3xl p-3 max-h-56 overflow-y-auto civic-shadow shadow-inner custom-scrollbar">
              <div className="grid grid-cols-1 gap-2">
                {sortedAndFilteredUsuarios.length > 0 ? (
                  sortedAndFilteredUsuarios.map((u) => {
                    const isSelected = selectedUsers.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                          } else {
                            setSelectedUsers([...selectedUsers, u.id]);
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                          isSelected 
                            ? 'bg-white border-primary shadow-sm' 
                            : 'bg-transparent border-transparent hover:bg-white/40'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                          isSelected ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant/40'
                        }`}>
                          {u.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                            {u.nombre}
                          </p>
                          <div className="flex items-center gap-2">
                             <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest truncate">
                                {u.rol === 'admin' ? 'Administrador' : 'Supervisor de Campo'}
                             </p>
                             {/* Badge de Workload */}
                             {(() => {
                               const count = userWorkload.get(u.id) || 0;
                               const colorClass = count === 0 ? 'bg-emerald-500' : count <= 2 ? 'bg-amber-500' : 'bg-rose-500';
                               return (
                                 <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-500">
                                   <div className={`w-1.5 h-1.5 rounded-full ${colorClass} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                                   <span className={`text-[9px] font-black uppercase tracking-tighter ${count === 0 ? 'text-emerald-600/70' : count <= 2 ? 'text-amber-600/70' : 'text-rose-600/70'}`}>
                                      {count} {count === 1 ? 'Tarea' : 'Tareas'}
                                   </span>
                                 </div>
                               );
                             })()}

                             {/* Badge de Sugerencia por Historial */}
                             {userExperienceMap.get(u.id) !== undefined && (
                               <div className="flex items-center gap-1 bg-stone-100 px-1.5 py-0.5 rounded-lg border border-stone-200 animate-in fade-in zoom-in duration-700">
                                 <Award className="w-2.5 h-2.5 text-primary" />
                                 <span className="text-[8px] font-black uppercase tracking-tighter text-stone-600">
                                    Sugerido ({userExperienceMap.get(u.id)})
                                 </span>
                               </div>
                             )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center animate-in zoom-in">
                            <span className="text-[10px]">✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-4 text-xs text-stone-400 italic">No hay usuarios disponibles</p>
                )}
              </div>
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  {selectedUsers.length} Seleccionados
                </span>
                <button 
                  type="button" 
                  onClick={() => setSelectedUsers([])}
                  className="text-[10px] font-bold text-stone-400 hover:text-red-500 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2 opacity-85">
              <MapPin className="w-4 h-4" /> Polígono (Sección/Manzana)
            </label>

            {tipoCapa === 'padron' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl mb-2 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setSelectionMode('manual')}
                    className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${selectionMode === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-stone-500 hover:text-primary hover:bg-white/50'}`}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectionMode('automatic')}
                    className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${selectionMode === 'automatic' ? 'bg-primary text-white shadow-sm' : 'text-stone-500 hover:text-primary hover:bg-white/50'}`}
                  >
                    Automático
                  </button>
                </div>

                {/* Municipio de Trabajo Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 opacity-70">
                    Municipio de trabajo
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMunicipioTrabajo}
                      onChange={(e) => setSelectedMunicipioTrabajo(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-primary/5 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-bold text-stone-600 appearance-none shadow-sm pr-10"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Cuernavaca">Cuernavaca</option>
                      <option value="Jiutepec">Jiutepec</option>
                      <option value="Cuautla">Cuautla</option>
                      <option value="Ayala">Ayala</option>
                      <option value="Temixco">Temixco</option>
                      <option value="Yautepec">Yautepec</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {selectionMode === 'automatic' && selectedMunicipioTrabajo !== 'Todos' && (
                  <div className="space-y-3 bg-primary/5 p-4 rounded-2xl border border-primary/10 animate-in fade-in zoom-in duration-300">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                        1. Sección de Origen
                      </label>
                      <div className="relative">
                        <select
                          value={autoOriginSectionId}
                          onChange={(e) => setAutoOriginSectionId(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-bold text-stone-600 appearance-none shadow-sm pr-10"
                        >
                          <option value="">Selecciona una sección...</option>
                          {seccionesPadron.map(s => (
                            <option key={s.id} value={s.id}>Sección {s.id}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    {autoOriginSectionId && (
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                          2. Cantidad de Secciones a Asignar
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={autoSelectionCount || ''}
                            onChange={(e) => setAutoSelectionCount(Number(e.target.value) || 1)}
                            className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-bold text-stone-600 shadow-sm"
                            placeholder="Ej. 5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectionMode === 'manual' && (
                  <input
                    type="text"
                    placeholder="Buscar sección (ej: 450)..."
                    value={searchTermPadron}
                    onChange={(e) => setSearchTermPadron(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                  />
                )}

                {/* ── Secciones seleccionadas (chips) ── */}
                {selectedSections.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-primary/5 border border-primary/10 rounded-2xl animate-in fade-in duration-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <CheckSquare className="w-3 h-3" />
                      {selectedSections.length === 1 ? '1 Sección seleccionada' : `${selectedSections.length} Secciones seleccionadas`}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedSections.map(sel => (
                        <span
                          key={sel.id}
                          className="inline-flex items-center gap-1.5 bg-primary text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-sm"
                        >
                          S-{sel.id}
                          {sel.distance !== undefined && sel.distance > 0 && (
                            <span className="opacity-75 font-medium ml-1">({formatDistance(sel.distance)})</span>
                          )}
                          {selectionMode === 'manual' && (
                            <button
                              type="button"
                              onClick={() => toggleSection(sel)}
                              className="hover:opacity-70 transition-opacity ml-0.5"
                              aria-label={`Quitar sección ${sel.id}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Combo de secciones cercanas ── */}
                {selectionMode === 'manual' && primarySection && seccionesCercanas && seccionesCercanas.length > 0 && (
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-primary">
                      <MapPin className="w-3.5 h-3.5 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Secciones cercanas (Origen: S-{primarySection.id})</span>
                    </div>
                    <div className="relative">
                      <select
                        value=""
                        onChange={(e) => {
                          const targetId = Number(e.target.value);
                          const found = seccionesCercanas.find(s => Number(s.id) === targetId);
                          if (found) toggleSection(found);
                        }}
                        className="w-full px-4 py-3 bg-white rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-bold text-stone-600 appearance-none shadow-sm pr-10 border border-stone-200"
                      >
                        <option value="" disabled>Selecciona una sección cercana para añadir...</option>
                        {seccionesCercanas.map((s) => (
                          <option key={s.id} value={s.id}>
                            📍 Sección {s.id} — {formatDistance(s.distance)}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Aviso cuando hay múltiples secciones: manzana no aplica ── */}
                {isMultiSection && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-bold">Con múltiples secciones se asigna la sección completa (sin manzana específica).</span>
                  </div>
                )}

                {selectionMode === 'manual' && (
                  <div className="max-h-80 overflow-y-auto rounded-2xl bg-surface-container-low divide-y divide-white/50 shadow-inner">
                  {seccionesPadron.map((s) => {
                      const sectionId = Number(s.id);
                      const isExpanded = expandedSection === sectionId;
                      const isSelected = isSectionSelected(s);
                      const sectionManzanas = isExpanded && !isMultiSection
                        ? (manzanasPorSeccion?.get(sectionId) ?? manzanasPadron.filter((m) => Number(m.seccion) === sectionId))
                        : [];

                      return (
                        <div key={s.id} className="flex flex-col">
                          <div
                            onClick={() => !isMultiSection && setExpandedSection(isExpanded ? null : sectionId)}
                            className={`p-4 transition-all flex justify-between items-center ${
                              isSelected
                                ? 'bg-primary/5 border-l-4 border-primary'
                                : 'hover:bg-white/40 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Icono expand (solo para sección única) */}
                              {!isMultiSection ? (
                                <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-primary text-white' : 'bg-white text-stone-400'}`}>
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                              ) : (
                                <div className="w-7 h-7" />
                              )}
                              <div>
                                <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>Sección {s.id}</p>
                                <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">Morelos</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-display font-black text-primary">{s.total?.toLocaleString() ?? 0}</p>
                                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Pads</p>
                              </div>
                              {/* Botón Todo → ahora toggle multi-selección */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSection(s);
                                  // Al seleccionar en modo single, expandir automáticamente
                                  if (!isSectionSelected(s)) setExpandedSection(sectionId);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-stone-400 hover:text-primary shadow-sm'
                                }`}
                              >
                                {isSelected ? '✓ Sel.' : 'Sel.'}
                              </button>
                            </div>
                          </div>

                          {/* Manzanas: solo si 1 sección seleccionada y está expandida */}
                          {isExpanded && !isMultiSection && (
                            <div className="bg-white/20 pl-4 pr-2 pb-2 space-y-1">
                              {sectionManzanas.length > 0 ? (
                                sectionManzanas
                                  .map((m) => (
                                    <div
                                      key={m.id}
                                      onClick={() => {
                                        setSelectedManzana(m);
                                        // Asegurar que esta sección es la única seleccionada
                                        const seccionObj = seccionesPadron.find(sec => Number(sec.id) === Number(m.seccion));
                                        if (seccionObj) setSelectedSections([seccionObj]);
                                        setSelectedPoligono(String(m.id));
                                      }}
                                      className={`p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                                        selectedManzana?.id === m.id
                                          ? 'bg-white text-primary shadow-sm'
                                          : 'text-stone-500 hover:bg-white/40'
                                      }`}
                                    >
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                          <MapIcon className="w-4 h-4 opacity-40" />
                                          <span className="text-xs font-bold">Manzana {m.manzana}</span>
                                        </div>
                                        {m.rank_near && (
                                          <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest pl-7 mt-0.5">
                                            Rango de cercanía #{m.rank_near} {m.rank_near === 1 && '• Más cercana'}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-surface-container-low text-stone-400 uppercase tracking-widest">
                                        MZ
                                      </span>
                                    </div>
                                  ))
                              ) : (
                                <p className="p-4 text-[10px] text-stone-400 italic font-medium">No hay manzanas disponibles</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative group">
                <select
                  value={selectedPoligono}
                  onChange={(e) => setSelectedPoligono(e.target.value)}
                  className="w-full px-5 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold text-on-surface appearance-none"
                  required
                >
                  <option value="">Seleccionar polígono...</option>
                  {poligonos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - {p.municipio}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-on-surface uppercase tracking-widest opacity-60">Vencimiento (Opcional)</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full px-5 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold text-on-surface"
            />
          </div>
        </div>

        {/* ── MODO COLABORATIVO: Toggles only if > 1 user ── */}
        <div className={`transition-all duration-500 overflow-hidden ${selectedUsers.length > 1 ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${
            isCollaborative 
              ? 'bg-primary/5 border-primary shadow-sm' 
              : 'bg-surface-container-low border-transparent'
          }`}>
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                isCollaborative ? 'bg-primary text-white rotate-3' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h4 className={`text-lg font-display font-black tracking-tight ${isCollaborative ? 'text-primary' : 'text-on-surface'}`}>
                  {isCollaborative ? 'Tarea Colaborativa' : 'Tareas Individuales'}
                </h4>
                <p className="text-xs text-stone-500 font-medium max-w-md">
                  {isCollaborative 
                    ? 'Todo el equipo compartirá la misma tarea, chat y evidencias. Ideal para trabajo en conjunto.' 
                    : 'Cada supervisor de campo recibirá una copia independiente del trabajo. Ideal para repartir manzanas.'}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsCollaborative(!isCollaborative)}
              className={`relative w-20 h-10 rounded-full transition-all duration-300 shadow-inner ${
                isCollaborative ? 'bg-primary' : 'bg-stone-300'
              }`}
            >
              <div className={`absolute top-1.5 w-7 h-7 bg-white rounded-full shadow-lg transition-all duration-500 ease-spring ${
                isCollaborative ? 'left-11' : 'left-2'
              }`} />
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-white transition-opacity ${isCollaborative ? 'opacity-100' : 'opacity-0'}`}>SI</span>
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-stone-500 transition-opacity ${isCollaborative ? 'opacity-0' : 'opacity-100'}`}>NO</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-on-surface uppercase tracking-widest opacity-60">Instrucciones</label>
          <textarea
            value={instruccion}
            onChange={(e) => setInstruccion(e.target.value)}
            placeholder="Describe la actividad a realizar..."
            className="w-full px-6 py-5 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium min-h-[140px] text-on-surface"
            required
          />
        </div>

        {/* ── SCHEDULER: Programación Automática ── */}
        <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/10 space-y-4">
          <label className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-3">
            <Clock className="w-5 h-5" /> Programar Activación (Opcional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={(() => { const d = new Date(Date.now() + 60000); const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })()}
              className="w-full px-5 py-4 bg-white rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold text-on-surface shadow-sm"
            />
            {scheduledAt && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full transition-all relative ${autoActivate ? 'bg-primary' : 'bg-stone-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoActivate ? 'left-5' : 'left-1'}`} />
                    <input
                      type="checkbox"
                      checked={autoActivate}
                      onChange={(e) => setAutoActivate(e.target.checked)}
                      className="hidden"
                    />
                  </div>
                  <span className="text-sm font-bold text-on-surface tracking-tight">Activar automáticamente</span>
                </label>
              </div>
            )}
          </div>
          {scheduledAt && (
            <p className="text-[10px] text-primary font-black uppercase tracking-widest bg-white/50 p-3 rounded-xl border border-primary/5">
              Estado: PROGRAMADA → Se activará el {new Date(scheduledAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          )}
        </div>

        {/* ── ALERTA DE DUPLICIDAD INTELIGENTE ── */}
        {duplicateTask && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="relative overflow-hidden p-6 md:p-8 rounded-[2.5rem] bg-stone-900 text-white shadow-2xl border border-white/10">
              {/* Decoración de fondo */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />

              <div className="relative flex flex-col md:flex-row gap-6 items-start">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-display font-black tracking-tight flex items-center gap-2">
                       Posible Duplicidad Detectada
                       <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest ml-2">Advertencia</span>
                    </h3>
                    <p className="text-stone-400 text-sm font-medium mt-1">
                      Ya existe una tarea activa en esta ubicación. Por favor, verifica si es necesario crear una nueva.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                       <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Responsable Actual</p>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-black">
                             {getUsername(duplicateTask.user_id).charAt(0)}
                          </div>
                          <span className="text-sm font-bold">{getUsername(duplicateTask.user_id)}</span>
                       </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                       <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Estado y Fecha</p>
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${duplicateTask.status === 'en_progreso' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                          <span className="text-sm font-bold capitalize">{duplicateTask.status.replace('_', ' ')} • {new Date(duplicateTask.created_at).toLocaleDateString('es-MX')}</span>
                       </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex gap-3">
                    <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] mb-1">Instrucción Previa</p>
                      <p className="text-xs text-stone-300 italic">"{duplicateTask.instruccion}"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual MiniMap Preview */}
            {selectedGeometry && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-stone-50 rounded-[32px] p-4 border border-stone-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <MapIcon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">Vista Previa de Zona</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full border border-stone-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Geo-Confirmado</span>
                    </div>
                  </div>
                  <MiniMap geometry={selectedGeometry} className="h-40 w-full" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-[0_8px_30px_rgb(28,28,23,0.1)] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Procesando...' : scheduledAt ? 'Programar' : 'Asignar Tarea'}
          </button>
        </div>
      </form>
    </>
  );
});
