import { UsuarioPerfil } from '../types';

export const ROLES = {
  ADMIN: 'admin',
  FIELD_WORKER: 'field_worker'
} as const;

export const isAdminUser = (perfil: UsuarioPerfil | null) => {
  return perfil?.rol === ROLES.ADMIN;
};
