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

  if (compact || (!location.seccion && !location.manzana)) {
    return <span>{location.label}</span>;
  }

  return (
    <div className="flex flex-col leading-tight">
      {location.seccion && <span>Sección {location.seccion}</span>}
      {location.manzana && (
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
          Manzana {location.manzana}
        </span>
      )}
    </div>
  );
};
