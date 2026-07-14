import React from 'react';
import { Poligono, Tarea } from '../../types';
import { getTaskLocationParts } from '../../utils/taskLocation';
import { getMunicipioBySeccion } from '../../constants/seccionesMunicipios';
import { getDistritoBySeccion } from '../../constants/seccionesDistritos';

interface TaskLocationLabelProps {
  task: Partial<Tarea>;
  poligono?: Poligono | null;
  compact?: boolean;
}

export const TaskLocationLabel: React.FC<TaskLocationLabelProps> = ({ task, poligono, compact = false }) => {
  const location = getTaskLocationParts(task, poligono);

  const municipio = location.seccion ? getMunicipioBySeccion(location.seccion) : null;
  const distrito = location.seccion ? getDistritoBySeccion(location.seccion) : null;

  // If compact mod is on (like in a small badge), we still try to show both but in one line
  if (compact) {
    const extraInfo = [];
    if (municipio) extraInfo.push(municipio);
    if (distrito) extraInfo.push(`D${distrito}`);
    const suffix = extraInfo.length > 0 ? ` · ${extraInfo.join(' ')}` : '';
    
    return <span className="truncate">{location.label}{suffix}</span>;
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
      {(municipio || distrito) && (
        <span className="text-[9px] font-black uppercase tracking-[0.05em] text-on-surface-variant opacity-60 mt-0.5">
          {municipio ? municipio : ''} {distrito ? `(D${distrito})` : ''}
        </span>
      )}
    </div>
  );
};
