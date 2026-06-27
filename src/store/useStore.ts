import { create } from 'zustand';
import { AuthUser } from '@supabase/supabase-js';
import { UsuarioPerfil, Poligono, Tarea } from '../types';
import { MassAssignmentResult } from '../hooks/useMassAssignment';

interface AppState {
  // Estado
  user: AuthUser | null;
  perfil: UsuarioPerfil | null;
  usuarios: UsuarioPerfil[];
  poligonos: Poligono[];
  tareas: Tarea[];
  seccionesPadron: any[];
  manzanasPadron: any[];
  selectedPoligono: Poligono | null;
  appLoading: boolean;
  mapStyle: 'streets' | 'satellite';
  error: string | null;
  // null = nada seleccionado (mapa vacío), 0 = Todos, 1-12 = distrito específico
  selectedDistrito: number | null;

  // Visualización de asignación masiva en el mapa
  massVisualization: MassAssignmentResult | null;
  massVisualizationFilter: string | null; // userId del equipo activo; null = "Todos"

  // Filtro de equipo en la capa del mapa regular (PadronLayer)
  mapTeamFilter: string | null; // userId del equipo seleccionado; null = "Todos"

  // Visibilidad de pines centroides rank 1 en NearManzanasLayer
  showRank1Pins: boolean;

  // Acciones
  setUser: (user: AuthUser | null) => void;
  setPerfil: (perfil: UsuarioPerfil | null) => void;
  setUsuarios: (usuarios: UsuarioPerfil[]) => void;
  setPoligonos: (poligonos: Poligono[]) => void;
  setTareas: (tareas: Tarea[]) => void;
  setSeccionesPadron: (secciones: any[]) => void;
  setManzanasPadron: (manzanas: any[]) => void;
  setSelectedPoligono: (poligono: Poligono | null) => void;
  setAppLoading: (loading: boolean) => void;
  setMapStyle: (style: 'streets' | 'satellite') => void;
  setError: (error: string | null) => void;
  setSelectedDistrito: (distrito: number | null) => void;
  setMassVisualization: (result: MassAssignmentResult | null) => void;
  setMassVisualizationFilter: (userId: string | null) => void;
  setMapTeamFilter: (userId: string | null) => void;
  setShowRank1Pins: (show: boolean) => void;

  // Limpieza
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  perfil: null,
  usuarios: [],
  poligonos: [],
  tareas: [],
  seccionesPadron: [],
  manzanasPadron: [],
  selectedPoligono: null,
  appLoading: true,
  mapStyle: 'streets',
  error: null,
  selectedDistrito: null,
  massVisualization: null,
  massVisualizationFilter: null,
  mapTeamFilter: null,
  showRank1Pins: false,

  setUser: (user) => set({ user }),
  setPerfil: (perfil) => set({ perfil }),
  setUsuarios: (usuarios) => set({ usuarios }),
  setPoligonos: (poligonos) => set({ poligonos }),
  setTareas: (tareas) => set({ tareas }),
  setSeccionesPadron: (seccionesPadron) => set({ seccionesPadron }),
  setManzanasPadron: (manzanasPadron) => set({ manzanasPadron }),
  setSelectedPoligono: (selectedPoligono) => set({ selectedPoligono }),
  setAppLoading: (appLoading) => set({ appLoading }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setError: (error) => set({ error }),
  setSelectedDistrito: (selectedDistrito) => set({
    selectedDistrito,
    selectedPoligono: null,
    mapTeamFilter: null,
  }),
  setMassVisualization: (massVisualization) => set({ massVisualization }),
  setMassVisualizationFilter: (massVisualizationFilter) => set({ massVisualizationFilter }),
  setMapTeamFilter: (mapTeamFilter) => set({ mapTeamFilter }),
  setShowRank1Pins: (showRank1Pins) => set({ showRank1Pins }),

  logout: () => set({
    user: null,
    perfil: null,
    usuarios: [],
    poligonos: [],
    tareas: [],
    selectedPoligono: null,
    error: null,
    selectedDistrito: null,
    massVisualization: null,
    massVisualizationFilter: null,
    mapTeamFilter: null,
  }),
}));
