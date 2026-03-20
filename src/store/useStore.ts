import { create } from 'zustand';
import { UsuarioPerfil, Poligono, Tarea } from '../types';

interface AppState {
  // Estado
  user: any | null;
  perfil: UsuarioPerfil | null;
  usuarios: UsuarioPerfil[];
  poligonos: Poligono[];
  tareas: Tarea[];
  selectedPoligono: Poligono | null;
  appLoading: boolean;
  error: string | null;

  // Acciones
  setUser: (user: any | null) => void;
  setPerfil: (perfil: UsuarioPerfil | null) => void;
  setUsuarios: (usuarios: UsuarioPerfil[]) => void;
  setPoligonos: (poligonos: Poligono[]) => void;
  setTareas: (tareas: Tarea[]) => void;
  setSelectedPoligono: (poligono: Poligono | null) => void;
  setAppLoading: (loading: boolean) => void;
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
  selectedPoligono: null,
  appLoading: true,
  error: null,

  setUser: (user) => set({ user }),
  setPerfil: (perfil) => set({ perfil }),
  setUsuarios: (usuarios) => set({ usuarios }),
  setPoligonos: (poligonos) => set({ poligonos }),
  setTareas: (tareas) => set({ tareas }),
  setSelectedPoligono: (selectedPoligono) => set({ selectedPoligono }),
  setAppLoading: (appLoading) => set({ appLoading }),
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
