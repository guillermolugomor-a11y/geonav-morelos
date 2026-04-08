import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { userService } from '../services/userService';
import { taskService } from '../services/taskService';
import { poligonosService } from '../services/poligonosService';
import { Poligono, Tarea, UsuarioPerfil } from '../types';
import { buildTaskPayload } from '../utils/taskPayload';
import { debugError, debugLog, debugWarn } from '../utils/debug';
import { 
  TaskAssignmentForm, 
  TaskMonitorView, 
  UserDirectoryView, 
  UserStatsView, 
  TaskModals 
} from './admin';
import { useStore } from '../store/useStore';
import { fetchWithCache } from '../utils/cache';

interface AdminPanelProps {
  perfil: UsuarioPerfil | null;
  onNavigateToMap?: (poligonoId: number) => void;
  viewMode?: 'gestion' | 'monitor' | 'usuarios' | 'estadisticas';
}

interface PadronSection {
  id: number;
  total?: number;
  hombres?: number;
  mujeres?: number;
  geometry?: any;
}

interface PadronManzana {
  id: number;
  seccion: number;
  manzana: number;
  municipio?: string;
  rank_near?: number;
  cent_seccion?: number; // La sección objetivo (donde está el centroide)
  geometry?: any;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ perfil, onNavigateToMap, viewMode = 'gestion' }) => {
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>([]);
  const [poligonos, setPoligonos] = useState<Poligono[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Tarea>>({});

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedPoligono, setSelectedPoligono] = useState('');
  const [tipoCapa] = useState('padron');
  const [instruccion, setInstruccion] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [autoActivate, setAutoActivate] = useState(false);
  
  // Usar Store global para datos de padrón
  const seccionesPadron = useStore(s => s.seccionesPadron);
  const setSeccionesPadron = useStore(s => s.setSeccionesPadron);
  const manzanasPadron = useStore(s => s.manzanasPadron);
  const setManzanasPadron = useStore(s => s.setManzanasPadron);

  const [searchTermPadron, setSearchTermPadron] = useState('');
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [selectedManzana, setSelectedManzana] = useState<PadronManzana | null>(null);
  const [selectedSection, setSelectedSection] = useState<PadronSection | null>(null);
  const [isCollaborative, setIsCollaborative] = useState(false);

  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // OPTIMIZACIÓN: Agrupar manzanas por sección una sola vez (O(n))
  const manzanasPorSeccion = useMemo(() => {
    const map = new Map<number, PadronManzana[]>();
    manzanasPadron.forEach(m => {
      // Usamos cent_seccion si existe (sección objetivo), fallback a m.seccion
      const seccionDestino = Number(m.cent_seccion || m.seccion);
      if (!map.has(seccionDestino)) map.set(seccionDestino, []);
      map.get(seccionDestino)?.push(m);
    });
    
    // Ordenar cada grupo por rank_near para cumplir con la prioridad
    map.forEach((manzanas) => {
      manzanas.sort((a, b) => (a.rank_near || 99) - (b.rank_near || 99));
    });

    return map;
  }, [manzanasPadron]);

  // OPTIMIZACIÓN: Memoizar secciones filtradas
  const seccionesFiltradas = useMemo(() => {
    if (!searchTermPadron) return seccionesPadron;
    const term = searchTermPadron.toLowerCase();
    return seccionesPadron.filter(s => s.id.toString().includes(term));
  }, [seccionesPadron, searchTermPadron]);

  const filteredTareas = useMemo(() => {
    return tareas.filter((task) => {
      const matchUser = !filterUser || (task.user_id === filterUser || (task.is_collaborative && task.collaborator_ids?.includes(filterUser)));
      const matchStatus = !filterStatus || task.status === filterStatus;
      return matchUser && matchStatus;
    });
  }, [filterStatus, filterUser, tareas]);

  const userWorkload = useMemo(() => {
    const map = new Map<string, number>();
    tareas.forEach(t => {
      if (t.status !== 'completada' && t.status !== 'programada') {
        map.set(t.user_id, (map.get(t.user_id) || 0) + 1);
        if (t.is_collaborative && t.collaborator_ids) {
          t.collaborator_ids.forEach(cid => {
            if (cid !== t.user_id) map.set(cid, (map.get(cid) || 0) + 1);
          });
        }
      }
    });
    return map;
  }, [tareas]);

  // Detector de duplicidad inteligente
  const duplicateTask = useMemo(() => {
    if (!selectedPoligono) return null;

    return tareas.find(t => {
      // Solo nos importan tareas activas
      if (t.status === 'completada') return false;

      // Si es padrón, somos más flexibles con la ubicación humana
      if (tipoCapa === 'padron' || t.tipo_capa === 'padron') {
        const tareaSeccion = String(t.seccion || t.clave_seccion || '');
        const currentSeccion = String(selectedSection?.id || '');
        
        const isSameSeccion = tareaSeccion === currentSeccion;
        if (!isSameSeccion) return false;

        // Si tenemos manzana seleccionada...
        if (selectedManzana) {
          const tareaManzana = String(t.manzana || t.clave_manzana || '');
          const currentManzana = String(selectedManzana.manzana || '');
          // Coincide si es la misma manzana O si la tarea existente es para TODA la sección (sin manzana)
          return tareaManzana === currentManzana || !tareaManzana;
        }

        // Si solo tenemos sección seleccionada (Todo)...
        // Coincide si la tarea existente es también para la sección (sin manzana) 
        // o si queremos alertar que ya hay gente en manzanas de esta sección (opcional, pero sugerido)
        return !t.manzana; 
      }

      // Para capas geométricas puras, usamos el polygon_id
      return t.polygon_id === Number(selectedPoligono);
    });
  }, [tareas, selectedPoligono, selectedSection, selectedManzana, tipoCapa]);

  // Mapa de experiencia: cuántas tareas ha tenido cada usuario en la zona seleccionada
  const userExperienceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedPoligono) return map;

    tareas.forEach(t => {
      // Para experiencia contamos todo (incluso completadas)
      let matches = false;
      if (tipoCapa === 'padron' || t.tipo_capa === 'padron') {
        const tareaSeccion = String(t.seccion || t.clave_seccion || '');
        const currentSeccion = String(selectedSection?.id || '');
        if (tareaSeccion === currentSeccion) {
          if (selectedManzana) {
            const tareaManzana = String(t.manzana || t.clave_manzana || '');
            matches = tareaManzana === String(selectedManzana.manzana);
          } else {
            matches = !t.manzana; // Solo sección
          }
        }
      } else {
        matches = t.polygon_id === Number(selectedPoligono);
      }

      if (matches) {
        map.set(t.user_id, (map.get(t.user_id) || 0) + 1);
        // Si es colaborativa, sumamos experiencia a todos
        if (t.is_collaborative && t.collaborator_ids) {
          t.collaborator_ids.forEach(cid => {
            if (cid !== t.user_id) map.set(cid, (map.get(cid) || 0) + 1);
          });
        }
      }
    });

    return map;
  }, [tareas, selectedPoligono, selectedSection, selectedManzana, tipoCapa]);

  const refreshTasks = async () => {
    const tasksResponse = await taskService.getAllTareas();
    debugLog('AdminPanel: Tareas recibidas de la DB:', tasksResponse.data);

    if (tasksResponse.error) {
      setMessage({ type: 'error', text: `Error al refrescar tareas: ${tasksResponse.error.message}` });
    }

    setTareas(tasksResponse.data);
  };

  const fetchPadronSecciones = async () => {
    // Si ya tenemos datos en el store global, no hacer nada
    if (seccionesPadron.length > 0 && manzanasPadron.length > 0) {
      debugLog('AdminPanel: Datos del padrón ya están en memoria.');
      return;
    }

    try {
      debugLog('AdminPanel: Cargando datos del padrón (Cache-First)...');
      
      const [secData, mzData] = await Promise.all([
        fetchWithCache<any>('/secciones_padron_optimizado.geojson'),
        fetchWithCache<any>('/manzanas_5_mas_cercanas_full.geojson')
      ]);

      const sections = secData.features.map((feature: any) => ({
        id: feature.properties.SECCION,
        total: feature.properties.total,
        hombres: feature.properties.hombres,
        mujeres: feature.properties.mujeres,
        geometry: feature.geometry
      }));

      const uniqueSections = Array.from(new Map(sections.map((item: PadronSection) => [item.id, item])).values());
      const sortedSections = uniqueSections.sort((a: any, b: any) => a.id - b.id);

      const manzanasRaw = mzData.features.map((feature: any) => ({
        id: feature.properties.ID,
        seccion: feature.properties.SECCION,
        manzana: feature.properties.MANZANA,
        municipio: feature.properties.MUNICIPIO,
        rank_near: feature.properties.rank_near,
        cent_seccion: feature.properties.cent_seccion,
        geometry: feature.geometry
      }));

      const uniqueManzanas = Array.from(
        new Map(manzanasRaw.map((m: any) => [`${m.id}_${m.cent_seccion}`, m])).values()
      );
      
      setSeccionesPadron(sortedSections);
      setManzanasPadron(uniqueManzanas as PadronManzana[]);
      debugLog('AdminPanel: Padrón cargado con geometrías:', { 
        sec: sortedSections.length, 
        mz: uniqueManzanas.length,
        hasGeom: !!sortedSections[0]?.geometry 
      });
    } catch (error) {
      debugError('Error cargando datos del padrón:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const [usersData, polyData, tasksResponse] = await Promise.all([
          userService.getAssignableUsers(),
          poligonosService.getPoligonos(),
          taskService.getAllTareas()
        ]);

        debugLog('Usuarios cargados desde DB:', usersData);
        if (usersData.length === 0) {
          debugWarn('No se encontraron usuarios en la tabla usuarios_perfil.');
        }

        setUsuarios(usersData);
        setPoligonos(polyData);
        setTareas(tasksResponse.data);

        if (tasksResponse.error) {
          setMessage({ type: 'error', text: `Error al cargar tareas: ${tasksResponse.error.message}` });
        }
      } catch (error: any) {
        debugError('Error loading admin data:', error);
        setMessage({ type: 'error', text: `Error de conexión: ${error.message || 'No se pudo conectar con la base de datos'}` });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchPadronSecciones();
  }, []);

  // Limpiar mensaje al cambiar entre Gestión y Monitoreo
  useEffect(() => {
    setMessage(null);
  }, [viewMode]);

  // Auto-limpieza de mensajes de éxito
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const resetForm = () => {
    setInstruccion('');
    setSelectedPoligono('');
    setSelectedUsers([]);
    setSelectedManzana(null);
    setSelectedSection(null);
    setExpandedSection(null);
    setScheduledAt('');
    setAutoActivate(false);
    setIsCollaborative(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0 || !selectedPoligono || !instruccion) {
      setMessage({ type: 'error', text: 'Por favor selecciona al menos un operativo y completa los campos obligatorios.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (isCollaborative) {
        // Asignación Colaborativa (Inteligente)
        debugLog('Enviando tarea colaborativa:', selectedUsers);
        const { error } = await taskService.asignarTareaColaborativa({
          polygon_id: Number(selectedPoligono),
          instruccion,
          tipo_capa: selectedManzana ? 'manzana' : 'padron',
          fecha_limite: fechaVencimiento || null,
          manzana: selectedManzana?.manzana,
          seccion: selectedManzana?.seccion || selectedSection?.id,
          scheduled_at: scheduledAt || null,
          auto_activate: autoActivate
        }, selectedUsers, perfil?.id);
        
        if (error) throw error;
        setMessage({ type: 'success', text: `Tarea colaborativa asignada a ${selectedUsers.length} operativos.` });
      } else if (selectedUsers.length === 1) {
        // Asignación simple
        const nuevaTarea = buildTaskPayload({
          userId: selectedUsers[0],
          polygonId: Number(selectedPoligono),
          instruccion,
          tipoCapa: selectedManzana ? 'manzana' : 'padron',
          fechaLimite: fechaVencimiento || null,
          selectedManzana,
          selectedSection,
          scheduledAt: scheduledAt || null,
          autoActivate
        });

        debugLog('Enviando tarea única:', nuevaTarea);
        const { error } = await taskService.asignarTarea(nuevaTarea, perfil?.id);
        if (error) throw error;
      } else {
        // Asignación masiva (Inteligente)
        const payloads = selectedUsers.map(userId => buildTaskPayload({
          userId,
          polygonId: Number(selectedPoligono),
          instruccion,
          tipoCapa: selectedManzana ? 'manzana' : 'padron',
          fechaLimite: fechaVencimiento || null,
          selectedManzana,
          selectedSection,
          scheduledAt: scheduledAt || null,
          autoActivate
        }));

        debugLog(`Enviando ${payloads.length} tareas masivas:`, payloads);
        const { error } = await taskService.asignarTareasMasivas(payloads, perfil?.id);
        if (error) throw error;
      }

      setMessage({ type: 'success', text: `Tarea asignada correctamente a ${selectedUsers.length} operativos.` });
      resetForm();
      refreshTasks();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTarea = async () => {
    if (!selectedTarea) return;

    setSubmitting(true);
    try {
      const { error } = await taskService.deleteTarea(selectedTarea.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Tarea eliminada correctamente.' });
      setIsDeleteModalOpen(false);
      refreshTasks();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error al eliminar: ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarea) return;

    setSubmitting(true);
    try {
      const { error } = await taskService.updateTarea(selectedTarea.id, editForm, perfil?.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Tarea actualizada correctamente.' });
      setIsEditModalOpen(false);
      refreshTasks();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error al actualizar: ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setIsDeleteModalOpen(true);
  };

  const openEditModal = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setEditForm({
      instruccion: tarea.instruccion,
      status: tarea.status,
      fecha_limite: tarea.fecha_limite
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setIsViewModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-transparent overflow-hidden">
      {viewMode === 'gestion' ? (
        <TaskAssignmentForm
          usuarios={usuarios}
          poligonos={poligonos}
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          selectedPoligono={selectedPoligono}
          setSelectedPoligono={setSelectedPoligono}
          fechaVencimiento={fechaVencimiento}
          setFechaVencimiento={setFechaVencimiento}
          instruccion={instruccion}
          setInstruccion={setInstruccion}
          scheduledAt={scheduledAt}
          setScheduledAt={setScheduledAt}
          autoActivate={autoActivate}
          setAutoActivate={setAutoActivate}
          seccionesPadron={seccionesFiltradas} // Pasar secciones ya filtradas
          searchTermPadron={searchTermPadron}
          setSearchTermPadron={setSearchTermPadron}
          manzanasPadron={manzanasPadron} // Se mantiene para fallback pero se usará el map
          manzanasPorSeccion={manzanasPorSeccion} // Nuevo prop para O(1)
          expandedSection={expandedSection}
          setExpandedSection={setExpandedSection}
          selectedManzana={selectedManzana}
          setSelectedManzana={setSelectedManzana}
          selectedSection={selectedSection}
          setSelectedSection={setSelectedSection}
          tipoCapa={tipoCapa}
          isCollaborative={isCollaborative}
          setIsCollaborative={setIsCollaborative}
          userWorkload={userWorkload}
          userExperienceMap={userExperienceMap}
          duplicateTask={duplicateTask}
          selectedGeometry={(() => {
            const geom = tipoCapa === 'padron' 
              ? (selectedManzana?.geometry || selectedSection?.geometry)
              : poligonos.find(p => p.id === Number(selectedPoligono))?.geom;
            if (geom) debugLog('AdminPanel: Pasando geometría al formulario:', geom.type);
            return geom;
          })()}
          submitting={submitting}
          message={message}
          onSubmit={handleSubmit}
        />
      ) : viewMode === 'monitor' ? (
        <TaskMonitorView
          usuarios={usuarios}
          poligonos={poligonos}
          tareas={filteredTareas}
          filterUser={filterUser}
          setFilterUser={setFilterUser}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onNavigateToMap={onNavigateToMap}
          onView={openViewModal}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          onRefresh={refreshTasks}
        />
      ) : viewMode === 'estadisticas' ? (
        <UserStatsView 
          usuarios={usuarios} 
          tareas={tareas} 
        />
      ) : (
        <UserDirectoryView 
          usuarios={usuarios} 
        />
      )}

      <TaskModals
        perfil={perfil}
        usuarios={usuarios}
        poligonos={poligonos}
        selectedTarea={selectedTarea}
        isViewModalOpen={isViewModalOpen}
        isEditModalOpen={isEditModalOpen}
        isDeleteModalOpen={isDeleteModalOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        submitting={submitting}
        onCloseView={() => setIsViewModalOpen(false)}
        onCloseEdit={() => setIsEditModalOpen(false)}
        onCloseDelete={() => setIsDeleteModalOpen(false)}
        onRefresh={refreshTasks}
        onSubmitEdit={handleEditTarea}
        onConfirmDelete={handleDeleteTarea}
        onNavigateToMap={onNavigateToMap}
      />
    </div>
  );
};

