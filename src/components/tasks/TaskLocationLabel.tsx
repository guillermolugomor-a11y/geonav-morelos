import React from 'react';
import { Poligono, Tarea } from '../../types';
import { getTaskLocationParts } from '../../utils/taskLocation';

interface TaskLocationLabelProps {
  task: Partial<Tarea>;
  poligono?: Poligono | null;
  compact?: boolean;
}

export const TaskLocationLabel: React.FC<TaskLocationLabelProps> = ({ task, poligono, compact = false }) => {
  const location = getTaskLocationParts(task, poligono);

  // If compact mod is on (like in a small badge), we still try to show both but in one line
  if (compact) {
    return <span className="truncate">{location.label}</span>;
  }

  // Uniform "Red Box" style for the Task Monitor
  return (
    <div className="flex flex-col leading-tight py-0.5">
      <span className="text-[11px] font-bold text-primary tracking-tight whitespace-nowrap">
        {location.seccion ? `Sección ${location.seccion}` : location.label}
      </span>
      {location.manzana && (
        <span className="text-[9px] font-black uppercase tracking-[0.05em] text-on-surface-variant opacity-60">
          Manzana {location.manzana}
        </span>
      )}
      {!location.manzana && location.seccion && (
        <span className="text-[9px] font-black uppercase tracking-[0.05em] text-on-surface-variant opacity-30">
          Ubicación Única
        </span>
      )}
    </div>
  );
};
