import React, { useCallback, useState } from 'react';
import { Poligono, Tarea, TareaHistorial } from '../types';
import { taskService } from '../services/taskService';
import { buildTaskPayload } from '../utils/taskPayload';
import { debugError } from '../utils/debug';

const resolveTipoCapa = (poligono: Poligono) => {
  const tipo = poligono.tipo;

  if (tipo === 'Manzana' || tipo === 'Manzana Completa' || tipo === 'Manzana (Cercana)') {
    return 'manzana';
  }

  if (tipo === 'Localidad') {
    return 'localidades';
  }

  return 'padron';
};

export const useTaskAssignment = (selectedPoligono: Poligono | null, onTaskUpdated?: () => void) => {
  const [activeTask, setActiveTask] = useState<Tarea | null>(null);
  const [historial, setHistorial] = useState<TareaHistorial[]>([]);
  const [loadingTask, setLoadingTask] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(false);

  const [assigningUser, setAssigningUser] = useState('');
  const [assigningInstruction, setAssigningInstruction] = useState('');
  const [assigningDate, setAssigningDate] = useState('');
  // Nuevos campos para scheduler
  const [assigningScheduledAt, setAssigningScheduledAt] = useState('');
  const [assigningAutoActivate, setAssigningAutoActivate] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchTask = useCallback(async (isAdmin: boolean, userId?: string) => {
    if (!selectedPoligono || (!isAdmin && !userId)) {
      setActiveTask(null);
      setHistorial([]);
      return;
    }

    setLoadingTask(true);
    setLoadingHistorial(true);
    setActiveTask(null);

    try {
      const tasks = await taskService.getTareasByPoligono(selectedPoligono.id, isAdmin ? undefined : userId);
      if (tasks.length > 0) {
        setActiveTask(tasks[0]);
        const history = await taskService.getTareaHistorial(tasks[0].id);
        setHistorial(history);
      } else {
        setHistorial([]);
      }
    } catch (error) {
      debugError(error);
    } finally {
      setLoadingTask(false);
      setLoadingHistorial(false);
    }
  }, [selectedPoligono]);

  const updateTaskStatus = async (taskId: string, newStatus: Tarea['status'], userId?: string) => {
    setUpdatingTask(true);
    try {
      const { error } = await taskService.updateTarea(taskId, { status: newStatus }, userId);
      if (!error) {
        setActiveTask((prev) => (prev ? { ...prev, status: newStatus } : null));
        onTaskUpdated?.();
      }
    } catch (err) {
      debugError(err);
    } finally {
      setUpdatingTask(false);
    }
  };

  const addUpdate = async (mensaje: string, userId: string) => {
    if (!activeTask || !mensaje.trim()) return;
    
    setUpdatingTask(true);
    try {
      // updateTareaStatus now handles both updating the task status/comments
      // and adding an entry to tarea_historial.
      const success = await taskService.updateTareaStatus(activeTask.id, activeTask.status, mensaje.trim(), userId);
      
      if (success) {
        // If updateTareaStatus was successful, we can assume the history was also added.
        // The component might need to refetch history or update its state to reflect the change.
        return true;
      }
      return false;
    } catch (err) {
      debugError(err);
      return false;
    } finally {
      setUpdatingTask(false);
    }
  };

  const assignTask = async (e: React.FormEvent, adminId?: string) => {
    e.preventDefault();
    if (!selectedPoligono || !assigningUser || !assigningInstruction.trim()) return;

    setIsAssigning(true);
    try {
      const payload = buildTaskPayload({
        userId: assigningUser,
        polygonId: Number(selectedPoligono.id),
        instruccion: assigningInstruction,
        fechaLimite: assigningDate || null,
        tipoCapa: resolveTipoCapa(selectedPoligono),
        poligono: selectedPoligono,
        scheduledAt: assigningScheduledAt || null,
        autoActivate: assigningScheduledAt ? assigningAutoActivate : false,
      });

      const { data, error } = await taskService.asignarTarea(payload, adminId);

      if (error) {
        throw error;
      }

      if (data) {
        setActiveTask(data);
        setAssigningUser('');
        setAssigningInstruction('');
        setAssigningDate('');
        setAssigningScheduledAt('');
        setAssigningAutoActivate(true);
        onTaskUpdated?.();
      }
    } catch (err: any) {
      debugError('Error al asignar tarea:', err);
      alert(`Error al asignar tarea: ${err?.message || 'Error desconocido'}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return {
    activeTask,
    historial,
    loadingTask,
    loadingHistorial,
    updatingTask,
    assigningUser,
    setAssigningUser,
    assigningInstruction,
    setAssigningInstruction,
    assigningDate,
    setAssigningDate,
    assigningScheduledAt,
    setAssigningScheduledAt,
    assigningAutoActivate,
    setAssigningAutoActivate,
    isAssigning,
    fetchTask,
    updateTaskStatus,
    addUpdate,
    assignTask
  };
};
