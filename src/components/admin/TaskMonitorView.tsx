import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, Archive, CalendarDays, ChevronDown, ClipboardList, Clock, Download, Edit2, Eye, MapPin, Trash2, User, X, CheckCircle2, RotateCcw, Search, ChevronRight, ChevronLeft, Users, Camera } from 'lucide-react';
import { exportTareasKml, exportTareasCsv } from '../../utils/exportKml';
import { useStore } from '../../store/useStore';
import { TEAM_HEX_COLORS } from '../../utils/teamColors';
import { Poligono, Tarea, UsuarioPerfil } from '../../types';
import { TaskLocationLabel } from '../tasks/TaskLocationLabel';
import { useNotifications } from '../notifications/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationIndicator } from '../notifications/NotificationIndicator';
import { taskService } from '../../services/taskService';

interface TaskMonitorViewProps {
  usuarios: UsuarioPerfil[];
  poligonos: Poligono[];
  tareas: Tarea[];
  allTareas: Tarea[];
  filterUser: string;
  setFilterUser: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterDate: string;
  setFilterDate: (value: string) => void;
  onNavigateToMap?: (polygonId: number) => void;
  onView: (tarea: Tarea) => void;
  onEdit: (tarea: Tarea) => void;
  onDelete: (tarea: Tarea) => void;
  onRefresh?: () => void;
}

export const TaskMonitorView: React.FC<TaskMonitorViewProps> = ({
  usuarios,
  poligonos,
  tareas,
  allTareas,
  filterUser,
  setFilterUser,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  onNavigateToMap,
  onView,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const { notifications } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [galleryPreview, setGalleryPreview] = useState<{ urls: string[], index: number } | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState('');
  const [monitorMode, setMonitorMode] = useState<'hoy' | 'historial'>('hoy');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'kml' | 'csv'>('kml');
  const [showCentroids, setShowCentroids] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const manzanasPadron = useStore(s => s.manzanasPadron);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Same color logic as PadronLayer — alphabetical non-admins
  const userColorMap = useMemo(() => {
    const map = new Map<string, string>();
    usuarios
      .filter(u => u.rol !== 'admin')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-MX', { sensitivity: 'base' }))
      .forEach((u, idx) => map.set(u.id, TEAM_HEX_COLORS[idx % TEAM_HEX_COLORS.length]));
    return map;
  }, [usuarios]);

  const userMap = useMemo(() => {
    const map = new Map<string, UsuarioPerfil>();
    usuarios.forEach(u => map.set(u.id, u));
    return map;
  }, [usuarios]);

  const polygonMap = useMemo(() => {
    const map = new Map<number, Poligono>();
    poligonos.forEach(p => map.set(p.id, p));
    return map;
  }, [poligonos]);

  const unreadTaskNotifications = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach(n => {
      if (n.metadata?.tarea_id) set.add(n.metadata.tarea_id);
    });
    return set;
  }, [notifications]);

  // Close export dropdown on outside click
  React.useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const filteredTareas = useMemo(() => {
    if (monitorMode === 'historial') {
      return allTareas
        .filter(t => {
          const isPast = t.fecha_operacion ? t.fecha_operacion < todayStr : false;
          const isCompleted = t.status === 'completada';
          if (!isPast && !isCompleted) return false;
          const matchUser = !filterUser || (t.user_id === filterUser || (t.is_collaborative && t.collaborator_ids?.includes(filterUser)));
          const matchStatus = !filterStatus || t.status === filterStatus;
          const usuario = userMap.get(t.user_id);
          const searchMatch = !searchTerm ||
            usuario?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.instruccion.toLowerCase().includes(searchTerm.toLowerCase());
          return matchUser && matchStatus && searchMatch;
        })
        .sort((a, b) => (b.fecha_operacion || '').localeCompare(a.fecha_operacion || ''));
    }
    return tareas.filter(t => {
      const usuario = userMap.get(t.user_id);
      const searchMatch = !searchTerm ||
        usuario?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.instruccion.toLowerCase().includes(searchTerm.toLowerCase());
      return searchMatch;
    });
  }, [tareas, allTareas, userMap, searchTerm, monitorMode, filterUser, filterStatus, todayStr]);

  // Users that have at least one task in the current filtered view
  const usersWithTasks = useMemo(() => {
    const countMap = new Map<string, number>();
    filteredTareas.forEach(t => countMap.set(t.user_id, (countMap.get(t.user_id) ?? 0) + 1));
    return Array.from(countMap.entries())
      .map(([userId, count]) => ({ user: userMap.get(userId), count }))
      .filter((e): e is { user: UsuarioPerfil; count: number } => e.user !== undefined)
      .sort((a, b) => a.user.nombre.localeCompare(b.user.nombre, 'es-MX', { sensitivity: 'base' }));
  }, [filteredTareas, userMap]);

  const allVisibleSelected = filteredTareas.length > 0 && filteredTareas.every(t => selectedTaskIds.has(t.id));
  
  const handleSelectAllToggle = () => {
    if (allVisibleSelected) {
      const newSelected = new Set(selectedTaskIds);
      filteredTareas.forEach(t => newSelected.delete(t.id));
      setSelectedTaskIds(newSelected);
    } else {
      const newSelected = new Set(selectedTaskIds);
      filteredTareas.forEach(t => newSelected.add(t.id));
      setSelectedTaskIds(newSelected);
    }
  };

  const handleSelectTaskToggle = (id: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTaskIds(newSelected);
  };

  const handleBulkFecha = async () => {
    if (!bulkDate) return;
    if (!window.confirm(`¿Cambiar la fecha de operación de ${selectedTaskIds.size} tareas a ${bulkDate}?`)) return;
    setProcessingId('bulk-fecha');
    try {
      const { error } = await taskService.updateTareasFechaOperacion(Array.from(selectedTaskIds), bulkDate);
      if (error) {
        alert(`Error al actualizar fecha: ${error.message}`);
      } else {
        setSelectedTaskIds(new Set());
        setBulkDate('');
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      alert(`Error inesperado: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente las ${selectedTaskIds.size} tareas seleccionadas? Esta acción es irreversible.`)) return;
    setProcessingId('bulk-delete');
    try {
      const { error } = await taskService.deleteTareas(Array.from(selectedTaskIds));
      if (error) {
        alert(`Error al eliminar tareas: ${error.message}`);
      } else {
        setSelectedTaskIds(new Set());
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      alert(`Error inesperado: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Keyboard navigation for gallery
  React.useEffect(() => {
    if (!galleryPreview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setGalleryPreview(prev => prev ? ({ ...prev, index: (prev.index + 1) % prev.urls.length }) : null);
      } else if (e.key === 'ArrowLeft') {
        setGalleryPreview(prev => prev ? ({ ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length }) : null);
      } else if (e.key === 'Escape') {
        setGalleryPreview(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryPreview]);

  const handleApprove = async (tarea: Tarea) => {
    if (!window.confirm('¿Aprobar esta tarea? Se registrará la validación final.')) return;
    setProcessingId(tarea.id);
    try {
      const success = await taskService.updateTareaStatus(tarea.id, 'completada', 'Tarea aprobada y validada por el administrador.');
      if (success && onRefresh) onRefresh();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (tarea: Tarea) => {
    const reason = window.prompt('¿Por qué rechazas esta tarea? (Opcional):');
    if (reason === null) return;
    
    setProcessingId(tarea.id);
    try {
      const success = await taskService.updateTareaStatus(tarea.id, 'en_progreso', `Tarea rechazada por el administrador. Motivo: ${reason || 'Sin especificar'}.`);
      if (success && onRefresh) onRefresh();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700 font-sans">
      {/* Header - Digital Curator: Editorial Authority */}
      <div className="p-6 md:p-12 bg-surface border-b border-outline-variant/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 max-w-screen-xl mx-auto">
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-on-surface flex items-center gap-4 tracking-tighter">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-ambient">
                <ClipboardList className="w-6" />
              </div>
              Monitor de Tareas
            </h3>
            <p className="text-[14px] text-on-surface-variant font-medium opacity-60 pl-16">
              Editorial de seguimiento institucional • <span className="italic">Personal de campo</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap justify-end">
            {/* Segmented Control: Hoy / Historial */}
            <div className="flex bg-surface-container-low rounded-2xl p-1 gap-0.5 border border-outline-variant/10 shadow-sm">
              <button
                onClick={() => setMonitorMode('hoy')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                  monitorMode === 'hoy'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-on-surface-variant opacity-50 hover:opacity-75'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Hoy
              </button>
              <button
                onClick={() => setMonitorMode('historial')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                  monitorMode === 'historial'
                    ? 'bg-white text-on-surface shadow-sm'
                    : 'text-on-surface-variant opacity-50 hover:opacity-75'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                Historial
              </button>
            </div>

            {/* Export KML dropdown */}
            <div ref={exportRef} className="relative">
              <button
                onClick={() => setExportOpen(v => !v)}
                disabled={filteredTareas.length === 0}
                className={`flex items-center justify-center gap-2.5 px-6 py-4 bg-white border text-on-surface text-[11px] font-black rounded-2xl shadow-sm uppercase tracking-[0.15em] transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  exportOpen
                    ? 'border-primary/30 text-primary bg-primary/5'
                    : 'border-outline-variant/20 hover:bg-surface-container-low hover:border-primary/20 hover:text-primary'
                }`}
              >
                <Download className="w-4 h-4" />
                Exportar KML
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`} />
              </button>

              {exportOpen && (() => {
                const dateStr  = new Date().toISOString().split('T')[0];
                const suffix   = monitorMode === 'historial' ? 'historial' : dateStr;
                const ext      = exportFormat;
                const doExport = (userId?: string, name?: string) => {
                  const safeName = name
                    ? name.replace(/\s+/g, '_').normalize('NFD').replace(/[̀-ͯ]/g, '')
                    : undefined;
                  const file = safeName
                    ? `asignaciones_${safeName}_${suffix}.${ext}`
                    : `asignaciones_${suffix}.${ext}`;
                  if (exportFormat === 'csv') {
                    exportTareasCsv(filteredTareas, poligonos, manzanasPadron, usuarios, userId, file);
                  } else {
                    exportTareasKml(filteredTareas, poligonos, manzanasPadron, usuarios, userId, showCentroids, file);
                  }
                  setExportOpen(false);
                };

                return (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-outline-variant/15 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                    {/* Format toggle */}
                    <div className="px-4 pt-3 pb-2 border-b border-outline-variant/10 bg-surface-container-low/40">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 mb-2">Formato</p>
                      <div className="flex bg-surface-container-low rounded-xl p-0.5 gap-0.5">
                        {(['kml', 'csv'] as const).map(fmt => (
                          <button
                            key={fmt}
                            onClick={() => setExportFormat(fmt)}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
                              exportFormat === fmt
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-on-surface-variant opacity-50 hover:opacity-75'
                            }`}
                          >
                            {fmt.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Centroides toggle — solo aplica a KML */}
                    {exportFormat === 'kml' && (
                      <div className="px-4 py-2.5 border-b border-outline-variant/10 bg-surface-container-low/40 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black text-on-surface">Pines de centroide</p>
                          <p className="text-[10px] text-on-surface-variant opacity-50 leading-tight">Incluir marcador central</p>
                        </div>
                        <button
                          onClick={() => setShowCentroids(v => !v)}
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${showCentroids ? 'bg-primary' : 'bg-outline-variant/30'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${showCentroids ? 'left-4' : 'left-0.5'}`} />
                        </button>
                      </div>
                    )}

                    {/* Todos los equipos */}
                    <button
                      onClick={() => doExport()}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-low text-left transition-colors border-b border-outline-variant/8"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Download className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-on-surface">Todos los equipos</p>
                        <p className="text-[11px] text-on-surface-variant opacity-50">
                          {filteredTareas.length} tarea{filteredTareas.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>

                    {/* Por equipo */}
                    {usersWithTasks.length > 1 && (
                      <div className="py-1 max-h-56 overflow-y-auto">
                        {usersWithTasks.map(({ user, count }) => {
                          const color = userColorMap.get(user.id) ?? '#808080';
                          return (
                            <button
                              key={user.id}
                              onClick={() => doExport(user.id, user.nombre)}
                              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low text-left transition-colors"
                            >
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-[11px] font-black"
                                style={{ backgroundColor: color }}
                              >
                                {user.nombre.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-on-surface truncate">{user.nombre}</p>
                                <p className="text-[11px] text-on-surface-variant opacity-50">
                                  {count} tarea{count !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <button
              onClick={async () => {
                if (!window.confirm('¿Deseas activar manualmente todas las tareas programadas?')) return;
                const btn = document.getElementById('btn-manual-activate');
                if (btn) btn.classList.add('animate-pulse', 'opacity-50');
                try {
                  const { activadas, error } = await taskService.activateScheduledTasks();
                  if (error) throw error;
                  alert(`✅ Se activaron ${activadas} tareas correctamente.`);
                  if (onRefresh) onRefresh();
                } catch (err: any) {
                  alert(`❌ Error al activar: ${err.message}`);
                } finally {
                  if (btn) btn.classList.remove('animate-pulse', 'opacity-50');
                }
              }}
              id="btn-manual-activate"
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-white text-[11px] font-black rounded-2xl hover:scale-[1.02] shadow-ambient uppercase tracking-[0.2em] transition-all"
            >
              <Clock className="w-4 h-4" />
              Activar Programadas
            </button>
          </div>
        </div>

        {/* Filters & Search - Functional Elegance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 max-w-screen-xl mx-auto">
          <div className="bg-white px-6 py-4 rounded-xl border border-outline-variant/15 flex items-center gap-4 shadow-sm group focus-within:ring-2 ring-primary/10 transition-all">
            <Search className="w-4 h-4 text-on-surface-variant opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] font-medium w-full text-on-surface placeholder:opacity-30"
            />
          </div>

          <div className="bg-white px-6 py-4 rounded-xl border border-outline-variant/15 flex items-center gap-4 shadow-sm group focus-within:ring-2 ring-primary/10 transition-all">
            <User className="w-4 h-4 text-on-surface-variant opacity-40" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] font-medium w-full text-on-surface cursor-pointer"
            >
              <option value="">Filtro: Todo el Personal</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          <div className="bg-white px-6 py-4 rounded-xl border border-outline-variant/15 flex items-center gap-4 shadow-sm group focus-within:ring-2 ring-primary/10 transition-all">
            <AlertCircle className="w-4 h-4 text-on-surface-variant opacity-40" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] font-medium w-full text-on-surface cursor-pointer"
            >
              <option value="">Filtro: Cualquier Estado</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En Progreso</option>
              <option value="completada">Completada</option>
              <option value="programada">Programada</option>
            </select>
          </div>

          {monitorMode === 'hoy' ? (
            <div className="bg-white px-6 py-4 rounded-xl border border-outline-variant/15 flex items-center gap-4 shadow-sm group focus-within:ring-2 ring-primary/10 transition-all">
              <CalendarDays className="w-4 h-4 text-on-surface-variant opacity-40 shrink-0" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                title="Filtrar por fecha de operación"
                className="bg-transparent border-none outline-none text-[13px] font-medium w-full text-on-surface cursor-pointer"
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="text-on-surface-variant opacity-40 hover:opacity-100 transition-opacity shrink-0"
                  title="Limpiar filtro de fecha"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-surface-container-low/60 px-6 py-4 rounded-xl border border-outline-variant/10 flex items-center gap-4">
              <Archive className="w-4 h-4 text-on-surface-variant opacity-30 shrink-0" />
              <span className="text-[12px] font-medium text-on-surface-variant opacity-40 italic truncate">
                Tareas completadas y de días anteriores
              </span>
            </div>
          )}
        </div>
      </div>


      {/* Main Content Area - Digital Curator: Architectural White Space */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 bg-surface-container-low animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Bulk operations bar */}
        {selectedTaskIds.size > 0 && (
          <div className="max-w-screen-xl mx-auto mb-8 bg-stone-50 border border-stone-200 py-4 px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-stone-700 uppercase tracking-wider">
                {selectedTaskIds.size} {selectedTaskIds.size === 1 ? 'tarea seleccionada' : 'tareas seleccionadas'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Cambiar fecha de operación */}
              <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 shadow-sm">
                <CalendarDays className="w-3.5 h-3.5 text-primary opacity-60 shrink-0" />
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="text-[11px] font-bold text-on-surface bg-transparent border-none outline-none cursor-pointer"
                />
              </div>
              <button
                onClick={handleBulkFecha}
                disabled={!bulkDate || processingId === 'bulk-fecha'}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all shadow-md disabled:opacity-40 active:scale-[0.98]"
              >
                {processingId === 'bulk-fecha' ? 'Aplicando...' : 'Cambiar Fecha'}
              </button>
              <div className="w-px h-6 bg-stone-200" />
              <button
                onClick={() => setSelectedTaskIds(new Set())}
                className="text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-stone-700 transition-colors bg-white px-4 py-2.5 rounded-xl border border-stone-200 shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={processingId === 'bulk-delete'}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all shadow-md disabled:opacity-50 active:scale-[0.98]"
              >
                {processingId === 'bulk-delete' ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        )}

        {/* Desktop View: Editorial Spread (Digital Curator) */}
        <div className="hidden md:block max-w-screen-xl mx-auto">
          {/* List Header - Synchronized Columns */}
          <div className="flex items-center px-8 mb-8 text-[11px] font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-90">
            <div className="w-[5%] flex justify-center">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={el => {
                  if (el) {
                    el.indeterminate = selectedTaskIds.size > 0 && !allVisibleSelected;
                  }
                }}
                onChange={handleSelectAllToggle}
                className="w-4 h-4 accent-primary cursor-pointer rounded border-stone-300"
                title="Seleccionar todo"
              />
            </div>
            <div className="w-[20%] pl-4 truncate">Supervisor de Campo</div>
            <div className="w-[15%] px-2">Ubicación</div>
            <div className="w-[20%] px-2">Instrucción</div>
            <div className="w-[15%] text-center">Estado</div>
            <div className="w-[10%] text-center">Operación</div>
            <div className="w-[15%] text-right pr-4">Gestión</div>
          </div>

          <div className="flex flex-col gap-6">
            {filteredTareas.length === 0 ? (
              <div className="py-32 text-center bg-white rounded-3xl shadow-sm border border-outline-variant/5">
                <div className="flex flex-col items-center gap-6 opacity-15">
                  <ClipboardList className="w-20 h-20 text-primary" />
                  <p className="text-[13px] font-black uppercase tracking-[0.4em] text-on-surface">Archivo Vacío</p>
                </div>
              </div>
            ) : (
              filteredTareas.map((tarea) => {
                const usuario = userMap.get(tarea.user_id);
                const poligono = polygonMap.get(tarea.polygon_id);

                return (
                  <div 
                    key={tarea.id} 
                    className="group bg-white rounded-[2rem] p-4 px-8 hover:shadow-ambient transition-all duration-500 relative"
                  >
                    <div className="flex items-center">
                      
                      {/* Selection Checkbox */}
                      <div className="w-[5%] flex justify-center">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.has(tarea.id)}
                          onChange={() => handleSelectTaskToggle(tarea.id)}
                          className="w-4 h-4 accent-primary cursor-pointer rounded border-stone-300"
                          title="Seleccionar tarea"
                        />
                      </div>

                      {/* Column 1: Personal (20%) */}
                      <div className="w-[20%] flex items-center gap-5 pl-4 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-xs font-black text-primary border border-outline-variant/10 group-hover:bg-white transition-colors duration-500 shrink-0">
                          {usuario?.nombre.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[17px] font-black text-on-surface tracking-tight leading-tight group-hover:text-primary transition-colors truncate">{usuario?.nombre}</span>
                          <span className="text-[12px] text-on-surface-variant font-medium tracking-tight opacity-50 italic truncate">{usuario?.email || 'correo@instituto.org'}</span>
                        </div>
                      </div>

                      {/* Column 2: Ubicación (15%) */}
                      <div className="w-[15%] min-w-0 px-2">
                        <button
                          onClick={() => onNavigateToMap?.(tarea.polygon_id)}
                          className="w-fit max-w-full flex items-center gap-2.5 px-4 py-2.5 bg-surface-container-low/50 rounded-2xl text-[11px] font-black text-primary hover:bg-primary-container hover:text-white transition-all shadow-sm group/loc overflow-hidden"
                        >
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate"><TaskLocationLabel task={tarea} poligono={poligono} /></span>
                        </button>
                      </div>

                      {/* Column 3: Instrucción (20%) */}
                      <div className="w-[20%] min-w-0 px-2">
                        <p className="text-[14px] text-on-surface-variant font-medium leading-relaxed italic border-l-3 border-outline-variant/10 pl-6 group-hover:border-primary/20 transition-all duration-700 truncate">
                          "{tarea.instruccion}"
                        </p>
                        {(tarea.evidencia_url || (tarea.evidencia_urls && tarea.evidencia_urls.length > 0)) && (
                          <div className="mt-3 flex overflow-x-auto gap-2.5 pl-6 pb-2 custom-scrollbar">
                             {(tarea.evidencia_urls && tarea.evidencia_urls.length > 0) ? (
                               tarea.evidencia_urls.map((url, idx) => (
                                 <div 
                                   key={`${tarea.id}-ev-${idx}`}
                                   className="w-11 h-11 rounded-lg overflow-hidden border border-outline-variant/15 cursor-pointer hover:scale-105 transition-transform shadow-sm shrink-0"
                                   onClick={() => setGalleryPreview({ urls: tarea.evidencia_urls!, index: idx })}
                                 >
                                   <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                                 </div>
                               ))
                             ) : (
                               <div 
                                 className="w-11 h-11 rounded-lg overflow-hidden border border-outline-variant/15 cursor-pointer hover:scale-105 transition-transform shadow-sm shrink-0"
                                 onClick={() => setGalleryPreview({ urls: [tarea.evidencia_url!], index: 0 })}
                               >
                                 <img src={tarea.evidencia_url} alt="Evidencia" className="w-full h-full object-cover" />
                               </div>
                             )}
                          </div>
                        )}
                      </div>

                      {/* Column 4: Estado (15%) */}
                      <div className="w-[15%] flex justify-center min-w-0">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-sm truncate max-w-full ${
                            tarea.status === 'completada' ? 'bg-[#e0f2f1] text-[#00695c]' :
                            tarea.status === 'en_progreso' ? 'bg-secondary-container text-on-secondary-container' :
                            tarea.status === 'programada' ? 'bg-[#e8eaf6] text-[#283593]' :
                            'bg-surface-container-low text-on-surface-variant'
                          }`}>
                            {tarea.status === 'programada' ? <Clock className="w-3.5 h-3.5 shrink-0" /> : <div className={`w-2 h-2 rounded-full shrink-0 ${tarea.status === 'completada' ? 'bg-[#009688]' : tarea.status === 'en_progreso' ? 'bg-[#ff9800]' : 'bg-stone-300'}`} />}
                            {tarea.status === 'programada' ? 'Programada' : tarea.status.replace('_', ' ')}
                          </span>
                          {tarea.is_collaborative && (
                            <div className="relative group/tooltip">
                              <span className="text-[9px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-help transition-all hover:bg-primary/20">
                                <Users className="w-2.5 h-2.5" /> Colaborativa
                              </span>
                              
                              {/* Tooltip con nombres */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] bg-stone-900 text-white text-[10px] p-3 rounded-xl opacity-0 scale-95 transition-all pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 z-[60] shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                                <p className="font-black uppercase tracking-[0.15em] border-b border-white/10 pb-1.5 mb-1.5 text-primary-container">Equipo de Trabajo</p>
                                <div className="space-y-1.5">
                                  {/* Responsable Principal */}
                                  <div className="flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                     <span className="font-bold">{userMap.get(tarea.user_id)?.nombre} (Líder)</span>
                                  </div>
                                  {/* Colaboradores adicionales */}
                                  {tarea.collaborator_ids?.filter(id => id !== tarea.user_id).map(id => (
                                    <div key={id} className="flex items-center gap-2 opacity-80">
                                       <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                       <span>{userMap.get(id)?.nombre || 'Usuario...'}</span>
                                    </div>
                                  ))}
                                  {(!tarea.collaborator_ids || tarea.collaborator_ids.length <= 1) && (
                                    <p className="text-[9px] italic opacity-50">Sin otros integrantes</p>
                                  )}
                                </div>
                                {/* Flechita del tooltip */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[6px] border-transparent border-t-stone-900" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Column 5: Fecha operación (10%) */}
                      <div className="w-[10%] text-center min-w-0 flex flex-col items-center gap-0.5">
                        <span className="text-[12px] font-black text-primary/70 tracking-tight truncate">
                          {tarea.fecha_operacion
                            ? new Date(tarea.fecha_operacion + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
                            : '—'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant opacity-30 tracking-tight truncate uppercase">
                          operación
                        </span>
                      </div>

                      {/* Column 6: Gestión (15%) */}
                      <div className="w-[15%] flex justify-end items-center gap-1 opacity-30 group-hover:opacity-100 transition-all duration-500 pr-4 min-w-0">
                        {tarea.status === 'completada' && (
                          <div className="flex items-center gap-1 mr-2 pr-2 border-r border-outline-variant/10">
                            <button
                              onClick={() => handleApprove(tarea)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all hover:scale-110"
                              title="Aprobar"
                            >
                              <CheckCircle2 size={16} strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => handleReject(tarea)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all hover:scale-110"
                              title="Rechazar"
                            >
                              <RotateCcw size={16} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                        <button onClick={() => onView(tarea)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-2xl transition-all"><Eye size={16} /></button>
                        <button onClick={() => onEdit(tarea)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-2xl transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => onDelete(tarea)} className="p-1.5 text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile View: Cards - Civic Nexus Redesign */}
        <div className="md:hidden space-y-4">
          {filteredTareas.length > 0 && (
            <div className="flex items-center justify-between px-2 mb-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-stone-200/50 shadow-sm">
              <label className="flex items-center gap-3 text-xs font-black uppercase tracking-wider text-stone-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={el => {
                    if (el) {
                      el.indeterminate = selectedTaskIds.size > 0 && !allVisibleSelected;
                    }
                  }}
                  onChange={handleSelectAllToggle}
                  className="w-4 h-4 accent-primary rounded border-stone-300"
                />
                Seleccionar todo
              </label>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                {filteredTareas.length} {filteredTareas.length === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>
          )}
          {filteredTareas.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-stone-200">
               <ClipboardList className="w-12 h-12 text-stone-200 mx-auto mb-4" />
               <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">No hay tareas asignadas</p>
            </div>
          ) : (
            filteredTareas.map((tarea) => {
              const usuario = userMap.get(tarea.user_id);
              const poligono = polygonMap.get(tarea.polygon_id);
              const hasUnread = unreadTaskNotifications.has(tarea.id);

              return (
                <div key={tarea.id} className="bg-white rounded-3xl p-6 shadow-ambient border border-stone-100 relative overflow-hidden group">
                  {/* Status Strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    tarea.status === 'completada' ? 'bg-emerald-500' :
                    tarea.status === 'en_progreso' ? 'bg-[#811B5A]' :
                    tarea.status === 'programada' ? 'bg-indigo-500' :
                    'bg-stone-200'
                  }`} />

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.has(tarea.id)}
                        onChange={() => handleSelectTaskToggle(tarea.id)}
                        className="w-4 h-4 accent-primary cursor-pointer rounded border-stone-300 shrink-0"
                        title="Seleccionar tarea"
                      />
                      <div className="flex flex-col">
                        <h4 className="font-black text-stone-900 leading-tight">
                          {usuario?.nombre || 'Usuario Desconocido'}
                        </h4>
                        <p className="text-[10px] text-stone-400 font-bold tracking-tight">{usuario?.email}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      tarea.status === 'completada' ? 'bg-emerald-50 text-emerald-600' :
                      tarea.status === 'en_progreso' ? 'bg-primary/5 text-primary' :
                      'bg-stone-100 text-stone-500'
                    }`}>
                      {tarea.status === 'programada' ? '⏰ Programada' : tarea.status.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigateToMap?.(tarea.polygon_id)}
                    className="w-full flex items-center gap-2 p-3 bg-surface-container-low rounded-2xl text-[11px] font-black text-primary mb-4 shadow-sm active:scale-95 transition-all"
                  >
                    <MapPin size={14} className="shrink-0" />
                    <TaskLocationLabel task={tarea} poligono={poligono} />
                    <ChevronRight size={14} className="ml-auto opacity-30" />
                  </button>

                  <p className="text-sm text-stone-600 font-medium leading-relaxed mb-4 italic pl-4 border-l-2 border-outline-variant/20">
                    "{tarea.instruccion}"
                  </p>

                  {(tarea.evidencia_url || (tarea.evidencia_urls && tarea.evidencia_urls.length > 0)) && (
                    <div className="mb-6">
                       <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {(tarea.evidencia_urls && tarea.evidencia_urls.length > 0) ? (
                            tarea.evidencia_urls.map((url, idx) => (
                              <div 
                                key={`mob-ev-${idx}`}
                                className="relative rounded-2xl overflow-hidden border border-stone-100 group/img shrink-0 w-48"
                              >
                                 <img 
                                    src={url} 
                                    alt={`Evidencia ${idx + 1}`} 
                                    className="w-full h-32 object-cover" 
                                 />
                                 <button 
                                   onClick={() => setGalleryPreview({ urls: tarea.evidencia_urls!, index: idx })}
                                   className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity"
                                 >
                                   <Camera className="w-6 h-6 text-white" />
                                 </button>
                              </div>
                            ))
                          ) : (
                            <div className="relative rounded-2xl overflow-hidden border border-stone-100 group/img shrink-0 w-full">
                               <img 
                                  src={tarea.evidencia_url} 
                                  alt="Evidencia" 
                                  className="w-full h-40 object-cover" 
                               />
                               <button 
                                 onClick={() => setGalleryPreview({ urls: [tarea.evidencia_url!], index: 0 })}
                                 className="absolute inset-0 bg-black/20 flex items-center justify-center"
                               >
                                 <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase text-primary shadow-lg flex items-center gap-2">
                                    <Camera className="w-3.5 h-3.5" /> Ampliar
                                 </div>
                               </button>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                    <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} />
                      {tarea.created_at ? new Date(tarea.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : 'Pendiente'}
                    </span>

                    <div className="flex items-center gap-1">
                      {tarea.status === 'completada' && (
                        <>
                          <button onClick={() => handleApprove(tarea)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={18} strokeWidth={2.5} /></button>
                          <button onClick={() => handleReject(tarea)} className="p-3 bg-rose-50 text-rose-600 rounded-xl ml-1"><RotateCcw size={18} strokeWidth={2.5} /></button>
                        </>
                      )}
                      <div className="w-px h-6 bg-stone-100 mx-2" />
                      <button onClick={() => onView(tarea)} className="p-3 bg-stone-50 text-stone-600 rounded-xl"><Eye size={18} /></button>
                      <button onClick={() => onEdit(tarea)} className="p-3 bg-stone-50 text-stone-600 rounded-xl"><Edit2 size={18} /></button>
                      <button onClick={() => onDelete(tarea)} className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <NotificationIndicator hasUnread={hasUnread} className="absolute top-4 right-4" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Previsualización de Imagen - Galería Interactiva */}
      <AnimatePresence>
        {galleryPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGalleryPreview(null)}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12"
          >
             {/* Botón de Cierre */}
             <button 
               className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-[110]"
               onClick={() => setGalleryPreview(null)}
             >
               <X className="w-6 h-6" />
             </button>

             {/* Navegación Izquierda */}
             {galleryPreview.urls.length > 1 && (
               <button
                 className="absolute left-4 md:left-12 w-14 h-14 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all z-[110]"
                 onClick={(e) => {
                   e.stopPropagation();
                   setGalleryPreview(prev => prev ? ({
                     ...prev,
                     index: (prev.index - 1 + prev.urls.length) % prev.urls.length
                   }) : null);
                 }}
               >
                 <ChevronLeft className="w-8 h-8" />
               </button>
             )}

             {/* Imagen Principal */}
             <div className="relative flex flex-col items-center gap-6 max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
               <motion.img
                 key={galleryPreview.urls[galleryPreview.index]}
                 initial={{ scale: 0.95, opacity: 0, x: 20 }}
                 animate={{ scale: 1, opacity: 1, x: 0 }}
                 exit={{ scale: 0.95, opacity: 0, x: -20 }}
                 src={galleryPreview.urls[galleryPreview.index]}
                 alt={`Evidencia ${galleryPreview.index + 1}`}
                 className="max-w-[70vw] max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
               />
               
               {/* Contador */}
               <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-white text-[12px] font-black tracking-widest uppercase border border-white/5 shadow-lg select-none">
                 Evidencia {galleryPreview.index + 1} / {galleryPreview.urls.length}
               </div>
             </div>

             {/* Navegación Derecha */}
             {galleryPreview.urls.length > 1 && (
               <button
                 className="absolute right-4 md:right-12 w-14 h-14 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all z-[110]"
                 onClick={(e) => {
                   e.stopPropagation();
                   setGalleryPreview(prev => prev ? ({
                     ...prev,
                     index: (prev.index + 1) % prev.urls.length
                   }) : null);
                 }}
               >
                 <ChevronRight className="w-8 h-8" />
               </button>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
