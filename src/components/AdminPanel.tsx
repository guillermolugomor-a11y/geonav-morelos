import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { userService } from '../services/userService';
import { taskService } from '../services/taskService';
import { poligonosService } from '../services/poligonosService';
import { Poligono, Tarea, UsuarioPerfil } from '../types';
import { buildTaskPayload } from '../utils/taskPayload';
import { debugError, debugLog, debugWarn } from '../utils/debug';
import { TaskAssignmentForm } from './admin/TaskAssignmentForm';
import { TaskMonitorView } from './admin/TaskMonitorView';
import { TaskModals } from './admin/TaskModals';

interface AdminPanelProps {
  perfil: UsuarioPerfil | null;
  onNavigateToMap?: (poligonoId: number) => void;
  viewMode?: 'gestion' | 'monitor';
}

interface PadronSection {
  id: number;
  total?: number;
  hombres?: number;
  mujeres?: number;
}

interface PadronManzana {
  id: number;
  seccion: number;
  manzana: number;
  municipio?: string;
  rank_near?: number;
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

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPoligono, setSelectedPoligono] = useState('');
  const [tipoCapa] = useState('padron');
  const [instruccion, setInstruccion] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [autoActivate, setAutoActivate] = useState(false);
  const [seccionesPadron, setSeccionesPadron] = useState<PadronSection[]>([]);
  const [searchTermPadron, setSearchTermPadron] = useState('');
  const [manzanasPadron, setManzanasPadron] = useState<PadronManzana[]>([]);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [selectedManzana, setSelectedManzana] = useState<PadronManzana | null>(null);
  const [selectedSection, setSelectedSection] = useState<PadronSection | null>(null);

  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // OPTIMIZACIÓN: Agrupar manzanas por sección una sola vez (O(n))
  const manzanasPorSeccion = useMemo(() => {
    const map = new Map<number, PadronManzana[]>();
    manzanasPadron.forEach(m => {
      const seccionId = Number(m.seccion);
      if (!map.has(seccionId)) map.set(seccionId, []);
      map.get(seccionId)?.push(m);
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
      const matchUser = !filterUser || task.user_id === filterUser;
      const matchStatus = !filterStatus || task.status === filterStatus;
      return matchUser && matchStatus;
    });
  }, [filterStatus, filterUser, tareas]);

  const refreshTasks = async () => {
    const tasksResponse = await taskService.getAllTareas();
    debugLog('AdminPanel: Tareas recibidas de la DB:', tasksResponse.data);

    if (tasksResponse.error) {
      setMessage({ type: 'error', text: `Error al refrescar tareas: ${tasksResponse.error.message}` });
    }

    setTareas(tasksResponse.data);
  };

  const fetchPadronSecciones = async () => {
    try {
      const secResponse = await fetch('/secciones_padron_optimizado.geojson');
      const secData = await secResponse.json();
      const sections = secData.features.map((feature: any) => ({
        id: feature.properties.SECCION,
        total: feature.properties.total,
        hombres: feature.properties.hombres,
        mujeres: feature.properties.mujeres
      }));

      const uniqueSections = Array.from(new Map(sections.map((item: PadronSection) => [item.id, item])).values());
      setSeccionesPadron(uniqueSections.sort((a: any, b: any) => a.id - b.id));

      const mzResponse = await fetch('/manzanas_5_mas_cercanas_full.geojson');
      const mzData = await mzResponse.json();
      const manzanas = mzData.features.map((feature: any) => ({
        id: feature.properties.ID,
        seccion: feature.properties.SECCION,
        manzana: feature.properties.MANZANA,
        municipio: feature.properties.MUNICIPIO,
        rank_near: feature.properties.rank_near
      }));
      setManzanasPadron(manzanas);
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
    setSelectedManzana(null);
    setSelectedSection(null);
    setExpandedSection(null);
    setScheduledAt('');
    setAutoActivate(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedPoligono || !instruccion) {
      setMessage({ type: 'error', text: 'Por favor completa los campos obligatorios.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const nuevaTarea = buildTaskPayload({
        userId: selectedUser,
        polygonId: Number(selectedPoligono),
        instruccion,
        tipoCapa: selectedManzana ? 'manzana' : 'padron',
        fechaLimite: fechaVencimiento || null,
        selectedManzana,
        selectedSection,
        scheduledAt: scheduledAt || null,
        autoActivate
      });

      debugLog('Enviando tarea:', nuevaTarea);
      const { error } = await taskService.asignarTarea(nuevaTarea, perfil?.id);
      if (error) throw error;

      setMessage({ type: 'success', text: 'Tarea asignada correctamente.' });
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
        <Loader2 className="w-8 h-8 animate-spin text-[#8C3154]" />
      </div>
    );
  }

  return (
    <div className="bg-[#F2F1E8] rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {viewMode === 'gestion' ? (
        <TaskAssignmentForm
          usuarios={usuarios}
          poligonos={poligonos}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
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
          submitting={submitting}
          message={message}
          onSubmit={handleSubmit}
        />
      ) : (
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

