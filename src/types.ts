export type UserRole = 'admin' | 'field_worker';

export interface UsuarioPerfil {
  id: string;
  nombre: string;
  rol: UserRole;
  email?: string;
  created_at: string;
}

export interface Poligono {
  id: number;
  nombre: string;
  municipio: string;
  tipo: string;
  metadata: {
    entidad?: number;
    distrito_federal?: number;
    distrito_local?: number;
    seccion: number;
    manzana?: number;
    localidad?: number;
    control?: string;
    promotor?: string;
    [key: string]: any;
  };
  geom: any; // GeoJSON
}

export interface Tarea {
  id: string;
  user_id: string;
  polygon_id: number;
  tipo_capa: string;
  instruccion: string;
  status: 'pendiente' | 'en_progreso' | 'completada';
  created_at: string;
  fecha_limite?: string;
  comentarios_usuario?: string;
  evidencia_url?: string;
}
