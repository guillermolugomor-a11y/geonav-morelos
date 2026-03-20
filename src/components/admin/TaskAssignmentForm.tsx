import React from 'react';
import { ClipboardList, Map as MapIcon, MapPin, Send, User, ChevronDown, ChevronRight } from 'lucide-react';
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
      <div className="p-6 border-b border-[#8C3154]/10 bg-[#F2F1E8]">
        <h2 className="text-xl font-bold text-[#8C3154] flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Gestión de Tareas
        </h2>
        <p className="text-sm text-stone-500 mt-1">Asigna polígonos y tareas específicas al personal de campo.</p>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <AdminMessage message={message} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Personal de Campo
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm"
              required
            >
              <option value="">Seleccionar usuario...</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.email || 'Sin email'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" /> Polígono (Sección/Manzana)
            </label>

            {tipoCapa === 'padron' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Buscar sección (ej: 450)..."
                  value={searchTermPadron}
                  onChange={(e) => setSearchTermPadron(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm"
                />
                <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-xl bg-white divide-y">
                  {seccionesPadron.map((s) => {
                      const sectionId = Number(s.id);
                      const isExpanded = expandedSection === sectionId;
                      // OPTIMIZACIÓN: Usar Mapa para O(1) o fallback a filtro solo si es necesario
                      const sectionManzanas = isExpanded 
                        ? (manzanasPorSeccion?.get(sectionId) ?? manzanasPadron.filter((m) => Number(m.seccion) === sectionId))
                        : []; 

                      return (
                        <div key={s.id} className="flex flex-col">
                          <div
                            onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
                            className={`p-3 cursor-pointer transition-colors flex justify-between items-center ${
                              selectedSection?.id === s.id && !selectedManzana
                                ? 'bg-[#8C3154]/5 border-l-4 border-[#8C3154]'
                                : 'hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-stone-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-stone-400" />
                              )}
                              <div>
                                <p className="text-sm font-bold text-slate-700">Sección {s.id}</p>
                                <p className="text-[10px] text-stone-500 uppercase font-medium">Morelos</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs font-black text-[#8C3154]">{s.total?.toLocaleString() ?? 0}</p>
                                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-tighter">Personas</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSection(s);
                                  setSelectedManzana(null);
                                  setSelectedPoligono(String(s.id));
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                  selectedSection?.id === s.id && !selectedManzana
                                    ? 'bg-[#8C3154] text-white'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                Todo
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="bg-stone-50/50 pl-8 divide-y divide-stone-100 border-t border-stone-100">
                              {sectionManzanas.length > 0 ? (
                                sectionManzanas.map((m) => (
                                  <div
                                    key={m.id}
                                    onClick={() => {
                                      setSelectedManzana(m);
                                      setSelectedSection(s);
                                      setSelectedPoligono(String(m.id));
                                    }}
                                    className={`p-2.5 cursor-pointer transition-colors flex justify-between items-center ${
                                      selectedManzana?.id === m.id
                                        ? 'bg-[#BC9B73]/10 text-[#7C4A36]'
                                        : 'hover:bg-white text-stone-600'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <MapIcon className="w-3 h-3 opacity-40" />
                                      <span className="text-xs font-medium">Manzana {m.manzana}</span>
                                    </div>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-400 uppercase">
                                      MZ
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="p-3 text-[10px] text-stone-400 italic">No hay manzanas disponibles</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <select
                value={selectedPoligono}
                onChange={(e) => setSelectedPoligono(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm"
                required
              >
                <option value="">Seleccionar polígono...</option>
                {poligonos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} - {p.municipio} (S:{p.metadata?.seccion || 'N/A'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider">Vencimiento (Opcional)</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider">Instrucciones</label>
          <textarea
            value={instruccion}
            onChange={(e) => setInstruccion(e.target.value)}
            placeholder="Describe la actividad a realizar..."
            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm min-h-[120px]"
            required
          />
        </div>

        {/* ── SCHEDULER: Programación Automática ── */}
        <div className="p-4 border border-[#8C3154]/20 rounded-xl bg-[#8C3154]/5 space-y-3">
          <label className="text-xs font-bold text-[#8C3154] uppercase tracking-wider flex items-center gap-2">
            ⏰ Programar Activación (Opcional)
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={(() => { const d = new Date(Date.now() + 60000); const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })()}
            className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#8C3154] focus:border-transparent outline-none transition-all text-sm"
          />
          {scheduledAt && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoActivate}
                  onChange={(e) => setAutoActivate(e.target.checked)}
                  className="w-4 h-4 accent-[#8C3154]"
                />
                <span className="text-sm text-stone-700">Activar automáticamente al llegar la hora</span>
              </label>
              <p className="text-xs text-[#8C3154] font-medium">
                Estado al asignar: <strong>Programada</strong> → se activará el{' '}
                {new Date(scheduledAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#8C3154] text-white rounded-xl text-sm font-bold hover:bg-[#7a2a49] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Procesando...' : scheduledAt ? 'Programar tarea' : 'Asignar tarea'}
          </button>
        </div>
      </form>
    </>
  );
});
