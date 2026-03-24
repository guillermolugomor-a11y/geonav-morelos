import React from 'react';
import { ClipboardList, Map as MapIcon, MapPin, Send, User, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { UsuarioPerfil } from '../../types';
import { AdminMessage } from './AdminMessage';

interface SectionItem {
  id: number | string;
  total?: number;
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
  selectedUser: string;
  setSelectedUser: (value: string) => void;
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
  seccionesPadron: SectionItem[];
  searchTermPadron: string;
  setSearchTermPadron: (value: string) => void;
  manzanasPadron: ManzanaItem[];
  expandedSection: number | null;
  setExpandedSection: (value: number | null) => void;
  selectedManzana: ManzanaItem | null;
  setSelectedManzana: (value: ManzanaItem | null) => void;
  selectedSection: SectionItem | null;
  setSelectedSection: (value: SectionItem | null) => void;
  tipoCapa: string;
  submitting: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  onSubmit: (e: React.FormEvent) => void;
  manzanasPorSeccion?: Map<number, ManzanaItem[]>;
}

export const TaskAssignmentForm: React.FC<TaskAssignmentFormProps> = React.memo(({
  usuarios,
  poligonos,
  selectedUser,
  setSelectedUser,
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
  seccionesPadron,
  searchTermPadron,
  setSearchTermPadron,
  manzanasPadron,
  expandedSection,
  setExpandedSection,
  selectedManzana,
  setSelectedManzana,
  selectedSection,
  setSelectedSection,
  tipoCapa,
  submitting,
  message,
  onSubmit,
  manzanasPorSeccion
}) => {
  return (
    <>
      <div className="p-6 md:p-8 bg-surface border-b border-primary/5">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-primary flex items-center gap-3 tracking-tight">
          <ClipboardList className="w-8 h-8" />
          Gestión de Tareas
        </h2>
        <p className="text-base text-stone-500 mt-2 font-medium">Asigna polígonos y tareas específicas a los operativos.</p>
      </div>

      <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-8 bg-surface">
        <AdminMessage message={message} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2 opacity-85">
              <User className="w-4 h-4" /> Operativos
            </label>
            <div className="relative group">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-5 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold text-on-surface appearance-none"
                required
              >
                <option value="">Seleccionar usuario...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2 opacity-85">
              <MapPin className="w-4 h-4" /> Polígono (Sección/Manzana)
            </label>

            {tipoCapa === 'padron' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Buscar sección (ej: 450)..."
                  value={searchTermPadron}
                  onChange={(e) => setSearchTermPadron(e.target.value)}
                  className="w-full px-5 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                />
                <div className="max-h-80 overflow-y-auto rounded-2xl bg-surface-container-low divide-y divide-white/50 shadow-inner">
                  {seccionesPadron.map((s) => {
                      const sectionId = Number(s.id);
                      const isExpanded = expandedSection === sectionId;
                      const sectionManzanas = isExpanded 
                        ? (manzanasPorSeccion?.get(sectionId) ?? manzanasPadron.filter((m) => Number(m.seccion) === sectionId))
                        : []; 

                      return (
                        <div key={s.id} className="flex flex-col">
                          <div
                            onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
                            className={`p-4 cursor-pointer transition-all flex justify-between items-center ${
                              selectedSection?.id === s.id && !selectedManzana
                                ? 'bg-white shadow-sm scale-[0.98] mx-2 my-1 rounded-xl'
                                : 'hover:bg-white/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-primary text-white' : 'bg-white text-stone-400'}`}>
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-on-surface">Sección {s.id}</p>
                                <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">Morelos</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-display font-black text-primary">{s.total?.toLocaleString() ?? 0}</p>
                                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Pads</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSection(s);
                                  setSelectedManzana(null);
                                  setSelectedPoligono(String(s.id));
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  selectedSection?.id === s.id && !selectedManzana
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-stone-400 hover:text-primary shadow-sm'
                                }`}
                              >
                                Todo
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="bg-white/20 pl-4 pr-2 pb-2 space-y-1">
                              {sectionManzanas.length > 0 ? (
                                sectionManzanas
                                  .map((m) => (
                                    <div
                                      key={m.id}
                                      onClick={() => {
                                        setSelectedManzana(m);
                                        setSelectedSection(s);
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
