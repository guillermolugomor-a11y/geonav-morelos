export type UserRole = 'admin' | 'field_worker' | 'campo';

export interface UsuarioPerfil {
  id: string;
  nombre: string;
  rol: UserRole;
  email?: string;
  created_at: string;
  last_login?: string;
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
  status: 'pendiente' | 'en_progreso' | 'completada' | 'programada';
  created_at: string;
  fecha_limite?: string;
  comentarios_usuario?: string;
  evidencia_url?: string;
  seccion?: string | null;
  manzana?: string | null;
  clave_seccion?: string | null;
  clave_manzana?: string | null;
  usuario_id?: string;
  // Nuevos campos para scheduler
  scheduled_at?: string | null;   // Fecha/hora de activación automática
  auto_activate?: boolean;          // Si se activa automáticamente al llegar la hora
}

export interface TareaHistorial {
  id: string;
  tarea_id: string;
  user_id: string;
  mensaje: string;
  estado_snapshot?: string | null;
  tipo: 'comentario' | 'avance' | 'cambio_estado' | 'sistema';
  created_at: string;
  perfil?: {
    nombre: string;
  };
}
