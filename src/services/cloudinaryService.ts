import { debugError, debugLog } from '../utils/debug';

const CLOUD_NAME = 'dzfzdkv2f';
const UPLOAD_PRESET = 'geonav_fotos';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

export const cloudinaryService = {
  /**
   * Sube una imagen a Cloudinary usando un Upload Preset no firmado.
   * @param file El archivo a subir
   * @param onProgress Callback opcional para monitorear el progreso
   */
  async uploadImage(
    file: File | Blob, 
    onProgress?: (percent: number) => void
  ): Promise<string | null> {
    try {
      debugLog('Iniciando carga en Cloudinary...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'geonav_evidencias'); // Organizar en carpetas

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', CLOUDINARY_URL, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText) as CloudinaryResponse;
            debugLog('Carga exitosa en Cloudinary:', response.secure_url);
            resolve(response.secure_url);
          } else {
            const error = JSON.parse(xhr.responseText);
            debugError('Error de Cloudinary:', error);
            reject(new Error(error.error?.message || 'Error al subir imagen'));
          }
        };

        xhr.onerror = () => {
          debugError('Error de red al subir a Cloudinary');
          reject(new Error('Error de red al conectar con Cloudinary'));
        };

        xhr.send(formData);
      });
    } catch (error) {
      debugError('Error inesperado en cloudinaryService:', error);
      return null;
    }
  }
};
