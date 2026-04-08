import { create } from 'zustand';
import { UsuarioPerfil, Poligono, Tarea } from '../types';

interface AppState {
  // Estado
  user: any | null;
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

  // Acciones
  setUser: (user: any | null) => void;
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

  logout: () => set({ 
    user: null, 
    perfil: null, 
    usuarios: [], 
    poligonos: [], 
    tareas: [],
    selectedPoligono: null,
    error: null
  }),
}));
