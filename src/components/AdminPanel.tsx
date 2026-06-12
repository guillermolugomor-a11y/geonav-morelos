import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { userService } from '../services/userService';
import { taskService } from '../services/taskService';
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
import { SECCIONES_POR_MUNICIPIO } from '../constants/seccionesMunicipios';
import { useMassAssignment } from '../hooks/useMassAssignment';

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
  distance?: number;
}

const getCentroid = (geometry: any): [number, number] | null => {
  if (!geometry) return null;
  let coords: any[] = [];
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    coords = geometry.coordinates.flatMap((poly: any) => poly[0]);
  } else if (geometry.type === 'Point') {
    coords = [geometry.coordinates];
  } else {
    return null;
  }

  if (coords.length === 0) return null;
  let x = 0;
  let y = 0;
  coords.forEach((c: any) => {
    x += c[0];
    y += c[1];
  });
  return [x / coords.length, y / coords.length];
};

const getHaversineDistance = (c1: [number, number], c2: [number, number]) => {
  const R = 6371000; // Earth's radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  
  const lon1 = c1[0];
  const lat1 = c1[1];
  const lon2 = c2[0];
  const lat2 = c2[1];
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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
  const poligonos = useStore(s => s.poligonos);
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
  const setMassVisualization = useStore(s => s.setMassVisualization);
  const setMassVisualizationFilter = useStore(s => s.setMassVisualizationFilter);

  const [selectedMunicipioTrabajo, setSelectedMunicipioTrabajo] = useState('Todos');

  const [searchTermPadron, setSearchTermPadron] = useState('');
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [selectedManzana, setSelectedManzana] = useState<PadronManzana | null>(null);
  // Multi-selección: array de secciones seleccionadas
  const [selectedSections, setSelectedSections] = useState<PadronSection[]>([]);

  // Nuevos estados para Modo Automático
  const [selectionMode, setSelectionMode] = useState<'manual' | 'automatic'>('manual');
  const [autoOriginSectionId, setAutoOriginSectionId] = useState<string>('');
  const [autoSelectionCount, setAutoSelectionCount] = useState<number>(5);

  useEffect(() => {
    // Limpiar selección previa al cambiar el municipio de trabajo o el modo
    setSelectedSections([]);
    setSelectedManzana(null);
    setExpandedSection(null);
    setSelectedPoligono('');
    setAutoOriginSectionId('');
    massAssignment.reset();
    setMassVisualization(null);
    setMassVisualizationFilter(null);
  }, [selectedMunicipioTrabajo, selectionMode]);

  // Sección primaria (primera del array) para compatibilidad con memos de experiencia y duplicados
  const primarySection: PadronSection | null = selectedSections[0] ?? null;
  const [isCollaborative, setIsCollaborative] = useState(false);

  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Mass assignment (flujo invertido automático) ──
  const massAssignment = useMassAssignment();

  // Sync mass assignment result to the global store so MapView can render the visualization
  useEffect(() => {
    setMassVisualization(massAssignment.result);
    if (!massAssignment.result) setMassVisualizationFilter(null);
  }, [massAssignment.result]);

  // Efecto para auto-selección
  useEffect(() => {
    if (selectionMode === 'automatic' && autoOriginSectionId && seccionesPadron.length > 0) {
      const origin = seccionesPadron.find(s => String(s.id) === autoOriginSectionId);
      if (!origin || !origin.geometry) {
         setSelectedSections([]);
         return;
      }

      const originCentroid = getCentroid(origin.geometry);
      if (!originCentroid) {
         setSelectedSections([]);
         return;
      }

      let allowedSectionsInMuni: number[] = [];
      if (selectedMunicipioTrabajo !== 'Todos') {
        allowedSectionsInMuni = SECCIONES_POR_MUNICIPIO[selectedMunicipioTrabajo] || [];
      } else {
        const muni = Object.keys(SECCIONES_POR_MUNICIPIO).find(muni => 
          SECCIONES_POR_MUNICIPIO[muni].includes(Number(origin.id))
        );
        allowedSectionsInMuni = muni ? SECCIONES_POR_MUNICIPIO[muni] : [];
      }

      const distances = seccionesPadron
        .filter(s => allowedSectionsInMuni.includes(Number(s.id)))
        .map(s => {
          const centroid = getCentroid(s.geometry);
          const distance = centroid ? getHaversineDistance(originCentroid, centroid) : Infinity;
          return { ...s, distance };
        })
        .filter(s => s.distance !== Infinity)
        .sort((a, b) => a.distance - b.distance);

      const autoSelected = distances.slice(0, autoSelectionCount);
      setSelectedSections(autoSelected);
      setSelectedPoligono(String(autoSelected[0]?.id || ''));
      setSelectedManzana(null);
    }
  }, [selectionMode, autoOriginSectionId, autoSelectionCount, seccionesPadron, selectedMunicipioTrabajo]);

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

  // Memoizar secciones filtradas por municipio de trabajo y término de búsqueda
  const seccionesFiltradas = useMemo(() => {
    let list = seccionesPadron;
    if (selectedMunicipioTrabajo !== 'Todos') {
      const allowedSections = SECCIONES_POR_MUNICIPIO[selectedMunicipioTrabajo] || [];
      list = list.filter(s => allowedSections.includes(Number(s.id)));
    }
    if (!searchTermPadron) return list;
    const term = searchTermPadron.toLowerCase();
    return list.filter(s => s.id.toString().includes(term));
  }, [seccionesPadron, selectedMunicipioTrabajo, searchTermPadron]);

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

  // Secciones con tareas activas: Map<sectionId, nombreUsuario>
  const seccionesOcupadas = useMemo(() => {
    const map = new Map<number, string>();
    tareas.forEach(t => {
      if (t.status === 'completada' || t.status === 'programada') return;
      const seccionId = Number(t.seccion ?? t.clave_seccion);
      if (!seccionId || map.has(seccionId)) return;
      const usuario = usuarios.find(u => u.id === t.user_id);
      map.set(seccionId, usuario?.nombre ?? 'Otro equipo');
    });
    return map;
  }, [tareas, usuarios]);

  // Detector de duplicidad inteligente (solo aplica sobre la sección primaria)
  const duplicateTask = useMemo(() => {
    if (!selectedPoligono || selectedSections.length === 0) return null;

    return tareas.find(t => {
      // Solo nos importan tareas activas
      if (t.status === 'completada') return false;

      // Si es padrón, somos más flexibles con la ubicación humana
      if (tipoCapa === 'padron' || t.tipo_capa === 'padron') {
        const tareaSeccion = String(t.seccion || t.clave_seccion || '');
        const currentSeccion = String(primarySection?.id || '');
        
        const isSameSeccion = tareaSeccion === currentSeccion;
        if (!isSameSeccion) return false;

        // Si tenemos manzana seleccionada (solo posible con 1 sección)...
        if (selectedManzana && selectedSections.length === 1) {
          const tareaManzana = String(t.manzana || t.clave_manzana || '');
          const currentManzana = String(selectedManzana.manzana || '');
          return tareaManzana === currentManzana || !tareaManzana;
        }

        return !t.manzana; 
      }

      // Para capas geométricas puras, usamos el polygon_id
      return t.polygon_id === Number(selectedPoligono);
    });
  }, [tareas, selectedPoligono, selectedSections, primarySection, selectedManzana, tipoCapa]);

  // Mapa de experiencia: cuántas tareas ha tenido cada usuario en la sección primaria seleccionada
  const userExperienceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedPoligono || !primarySection) return map;

    tareas.forEach(t => {
      let matches = false;
      if (tipoCapa === 'padron' || t.tipo_capa === 'padron') {
        const tareaSeccion = String(t.seccion || t.clave_seccion || '');
        const currentSeccion = String(primarySection.id);
        if (tareaSeccion === currentSeccion) {
          if (selectedManzana && selectedSections.length === 1) {
            const tareaManzana = String(t.manzana || t.clave_manzana || '');
            matches = tareaManzana === String(selectedManzana.manzana);
          } else {
            matches = !t.manzana;
          }
        }
      } else {
        matches = t.polygon_id === Number(selectedPoligono);
      }

      if (matches) {
        map.set(t.user_id, (map.get(t.user_id) || 0) + 1);
        if (t.is_collaborative && t.collaborator_ids) {
          t.collaborator_ids.forEach(cid => {
            if (cid !== t.user_id) map.set(cid, (map.get(cid) || 0) + 1);
          });
        }
      }
    });

    return map;
  }, [tareas, selectedPoligono, selectedSections, primarySection, selectedManzana, tipoCapa]);

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

      const uniqueSections: PadronSection[] = Array.from(new Map<number, PadronSection>(sections.map((item: PadronSection) => [item.id, item])).values());
      const sortedSections = uniqueSections.sort((a: PadronSection, b: PadronSection) => a.id - b.id);

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
        hasGeom: !!(sortedSections[0] as PadronSection)?.geometry 
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
        const [usersData, tasksResponse] = await Promise.all([
          userService.getAssignableUsers(),
          taskService.getAllTareas()
        ]);

        debugLog('Usuarios cargados desde DB:', usersData);
        if (usersData.length === 0) {
          debugWarn('No se encontraron usuarios en la tabla usuarios_perfil.');
        }

        setUsuarios(usersData);
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
    setSelectedSections([]);
    setExpandedSection(null);
    setScheduledAt('');
    setAutoActivate(false);
    setIsCollaborative(false);
  };

  const handleMassCalcular = () => {
    massAssignment.calcular(seccionesDisponibles, usuarios, selectedMunicipioTrabajo);
  };

  const handleMassGuardar = async () => {
    if (!massAssignment.result) return;
    const saved = await massAssignment.guardar(
      massAssignment.result.blocks,
      instruccion,
      fechaVencimiento || null,
      perfil?.id
    );
    if (saved) {
      resetForm();
      massAssignment.reset();
      refreshTasks();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0 || selectedSections.length === 0 || !instruccion) {
      setMessage({ type: 'error', text: 'Por favor selecciona al menos un supervisor de campo, al menos una sección y escribe las instrucciones.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const isMultiSection = selectedSections.length > 1;
    // Con multi-sección la manzana no aplica (siempre se asigna la sección completa)
    const efectivaManzana = isMultiSection ? null : selectedManzana;
    const tipoCapa = efectivaManzana ? 'manzana' : 'padron';

    try {
      if (isCollaborative && !isMultiSection) {
        // ── Colaborativa de sección única ──
        debugLog('Enviando tarea colaborativa (1 sección):', selectedUsers);
        const sec = selectedSections[0];
        const { error } = await taskService.asignarTareaColaborativa({
          polygon_id: Number(sec.id),
          instruccion,
          tipo_capa: tipoCapa,
          fecha_limite: fechaVencimiento || null,
          manzana: efectivaManzana?.manzana,
          seccion: efectivaManzana?.seccion ?? sec.id,
          scheduled_at: scheduledAt || null,
          auto_activate: autoActivate
        }, selectedUsers, perfil?.id);
        if (error) throw error;
        setMessage({ type: 'success', text: `Tarea colaborativa asignada a ${selectedUsers.length} supervisores de campo en Sección ${sec.id}.` });

      } else {
        // ── Asignación masiva: una tarea por cada combinación (usuario × sección) ──
        const payloads: any[] = [];

        for (const sec of selectedSections) {
          for (const userId of selectedUsers) {
            payloads.push(buildTaskPayload({
              userId,
              polygonId: Number(sec.id),
              instruccion,
              tipoCapa,
              fechaLimite: fechaVencimiento || null,
              selectedManzana: efectivaManzana,
              selectedSection: { id: sec.id },
              scheduledAt: scheduledAt || null,
              autoActivate,
            }));
          }
        }

        debugLog(`Enviando ${payloads.length} tareas (${selectedSections.length} secciones × ${selectedUsers.length} supervisores de campo):`, payloads);

        if (payloads.length === 1) {
          // Camino rápido: inserción simple
          const { error } = await taskService.asignarTarea(payloads[0], perfil?.id);
          if (error) throw error;
        } else {
          const { error } = await taskService.asignarTareasMasivas(payloads, perfil?.id);
          if (error) throw error;
        }

        const seccionesLabel = selectedSections.length === 1
          ? `Sección ${selectedSections[0].id}`
          : `${selectedSections.length} secciones`;
        setMessage({ type: 'success', text: `${payloads.length} tarea(s) asignada(s) correctamente (${seccionesLabel} · ${selectedUsers.length} supervisor(es) de campo).` });
      }

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

  // Obtener las 9 secciones más cercanas a la sección primaria seleccionada
  const seccionesCercanas = useMemo(() => {
    if (!primarySection || !seccionesPadron.length) return [];

    // Encontrar el municipio de la sección seleccionada
    const currentSectionMuni = Object.keys(SECCIONES_POR_MUNICIPIO).find(muni => 
      SECCIONES_POR_MUNICIPIO[muni].includes(Number(primarySection.id))
    );
    
    if (!currentSectionMuni) return [];
    
    const allowedSectionsInMuni = SECCIONES_POR_MUNICIPIO[currentSectionMuni] || [];
    
    const originCentroid = getCentroid(primarySection.geometry);
    if (!originCentroid) return [];

    // Excluimos las secciones que ya están seleccionadas
    const selectedIds = new Set(selectedSections.map(s => Number(s.id)));

    return seccionesPadron
      .filter(s => 
        !selectedIds.has(Number(s.id)) && 
        allowedSectionsInMuni.includes(Number(s.id))
      )
      .map(s => {
        const centroid = getCentroid(s.geometry);
        const distance = centroid ? getHaversineDistance(originCentroid, centroid) : Infinity;
        return { ...s, distance };
      })
      .filter(s => s.distance !== Infinity)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 9);
  }, [primarySection, selectedSections, seccionesPadron]);

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
          seccionesPadron={seccionesFiltradas}
          searchTermPadron={searchTermPadron}
          setSearchTermPadron={setSearchTermPadron}
          manzanasPadron={manzanasPadron}
          manzanasPorSeccion={manzanasPorSeccion}
          expandedSection={expandedSection}
          setExpandedSection={setExpandedSection}
          selectedManzana={selectedManzana}
          setSelectedManzana={(value) => setSelectedManzana(value as typeof selectedManzana)}
          selectedSections={selectedSections}
          setSelectedSections={(value) => setSelectedSections(value as typeof selectedSections)}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          autoOriginSectionId={autoOriginSectionId}
          setAutoOriginSectionId={setAutoOriginSectionId}
          autoSelectionCount={autoSelectionCount}
          setAutoSelectionCount={setAutoSelectionCount}
          seccionesCercanas={seccionesCercanas}
          selectedMunicipioTrabajo={selectedMunicipioTrabajo}
          setSelectedMunicipioTrabajo={setSelectedMunicipioTrabajo}
          tipoCapa={tipoCapa}
          isCollaborative={isCollaborative}
          setIsCollaborative={setIsCollaborative}
          userWorkload={userWorkload}
          userExperienceMap={userExperienceMap}
          duplicateTask={duplicateTask}
          seccionesOcupadas={seccionesOcupadas}
          selectedGeometry={(() => {
            const geom = tipoCapa === 'padron'
              ? (selectedManzana?.geometry || primarySection?.geometry)
              : poligonos.find(p => p.id === Number(selectedPoligono))?.geom;
            if (geom) debugLog('AdminPanel: Pasando geometría al formulario:', geom.type);
            return geom;
          })()}
          submitting={submitting}
          message={message}
          onSubmit={handleSubmit}
          seccionesOcupadas={seccionesOcupadas}
          massAssignmentResult={massAssignment.result}
          massNumEquipos={massAssignment.numEquipos}
          setMassNumEquipos={massAssignment.setNumEquipos}
          massCantidadSecciones={massAssignment.cantidadSecciones}
          setMassCantidadSecciones={massAssignment.setCantidadSecciones}
          seccionesDisponiblesMass={seccionesDisponibles}
          massTotalSecciones={seccionesFiltradas.filter(s => s.geometry).length}
          onMassCalcular={handleMassCalcular}
          onMassReset={massAssignment.reset}
          onMassGuardar={handleMassGuardar}
          massIsSaving={massAssignment.isSaving}
          massSaveMessage={massAssignment.saveMessage}
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

