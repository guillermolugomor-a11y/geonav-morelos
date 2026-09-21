import React from 'react';
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, Send } from 'lucide-react';
import { UsuarioPerfil } from '../../types';
import {
  CsvValidatedRow,
  buildCsvTemplate,
  parseCsv,
  validateCsvRows,
} from '../../utils/csvImport';

interface CsvImportPanelProps {
  usuarios: UsuarioPerfil[];
  seccionesIds: number[];
  manzanas: Array<{ id: number | string; seccion: number | string; manzana: number | string }>;
  seccionesOcupadas: Map<number, { userName: string }>;
  isSaving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  onGuardar: (rows: CsvValidatedRow[]) => Promise<boolean>;
}

export const CsvImportPanel: React.FC<CsvImportPanelProps> = ({
  usuarios,
  seccionesIds,
  manzanas,
  seccionesOcupadas,
  isSaving,
  message,
  onGuardar,
}) => {
  const [fileName, setFileName] = React.useState('');
  const [rawText, setRawText] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const seccionesSet = React.useMemo(() => new Set(seccionesIds), [seccionesIds]);

  const { rows, headerError } = React.useMemo(() => {
    if (rawText === null) return { rows: [] as CsvValidatedRow[], headerError: null as string | null };
    const parsed = parseCsv(rawText);
    if (parsed.headerError) return { rows: [] as CsvValidatedRow[], headerError: parsed.headerError };
    return {
      rows: validateCsvRows(parsed.rows, { usuarios, seccionesIds: seccionesSet, manzanas, seccionesOcupadas }),
      headerError: null,
    };
  }, [rawText, usuarios, seccionesSet, manzanas, seccionesOcupadas]);

  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows = rows.length - validRows.length;
  const totalEncuestas = validRows.reduce((sum, r) => sum + (r.metaEncuestas ?? 0), 0);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRawText(await file.text());
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildCsvTemplate()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_asignaciones.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGuardar = async () => {
    const ok = await onGuardar(validRows);
    if (ok) {
      setRawText(null);
      setFileName('');
    }
  };

  return (
    <div className="space-y-4 p-5 rounded-[1.75rem] border border-primary/10 bg-primary/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface/60">Importar asignaciones desde CSV</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-outline-variant/15 text-stone-600 hover:text-primary shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Plantilla
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-sm hover:opacity-90 transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> Cargar CSV
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      <p className="text-[11px] text-stone-500 font-medium">
        Columnas: <b>Operativo, Tipo, Municipio, Sección, Manzana, Total de encuestas, Instrucción, Fecha límite</b>.
        Obligatorias: Operativo, Sección, Total de encuestas e Instrucción. No se guarda nada hasta que confirmes.
      </p>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {headerError && (
        <div className="px-4 py-3 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">{headerError}</div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-stone-500 bg-white border border-outline-variant/15 px-3 py-1.5 rounded-full">{fileName}</span>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">{validRows.length} válidas</span>
            {errorRows > 0 && (
              <span className="text-[10px] font-black text-red-700 bg-red-50 px-3 py-1.5 rounded-full">{errorRows} con error</span>
            )}
            <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full">{totalEncuestas.toLocaleString()} encuestas</span>
          </div>

          <div className="max-h-96 overflow-auto rounded-2xl bg-white border border-outline-variant/10 shadow-sm">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-stone-50 text-stone-500 uppercase tracking-wider text-[9px] font-black">
                <tr>
                  <th className="px-3 py-2 text-left w-8"></th>
                  <th className="px-3 py-2 text-left">Línea</th>
                  <th className="px-3 py-2 text-left">Operativo</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Municipio</th>
                  <th className="px-3 py-2 text-left">Sección</th>
                  <th className="px-3 py-2 text-left">Mz</th>
                  <th className="px-3 py-2 text-right">Encuestas</th>
                  <th className="px-3 py-2 text-left">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {rows.map(r => {
                  const ok = r.errors.length === 0;
                  return (
                    <tr key={r.line} className={ok ? '' : 'bg-red-50/60'}>
                      <td className="px-3 py-2">
                        {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      </td>
                      <td className="px-3 py-2 text-stone-400">{r.line}</td>
                      <td className="px-3 py-2 font-bold">{r.operativo}</td>
                      <td className="px-3 py-2">{r.tipo || 'Sección'}</td>
                      <td className="px-3 py-2">{r.municipio}</td>
                      <td className="px-3 py-2 font-black">{r.seccion}</td>
                      <td className="px-3 py-2">{r.manzana}</td>
                      <td className="px-3 py-2 text-right font-bold">{r.encuestas}</td>
                      <td className="px-3 py-2 text-red-600 font-bold">{r.errors.join(' · ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 p-5 rounded-[1.5rem]" style={{ background: '#1E0014' }}>
            <span className="text-[11px] font-medium" style={{ color: 'rgba(245,237,232,0.6)' }}>
              {errorRows > 0
                ? `Las ${errorRows} filas con error se omitirán.`
                : 'Todas las filas son válidas.'}
            </span>
            <button
              type="button"
              disabled={isSaving || validRows.length === 0}
              onClick={handleGuardar}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 shrink-0"
              style={{ background: '#BC9B73', color: '#1E0014' }}
            >
              <Send className="w-4 h-4" />
              {isSaving ? 'Guardando...' : `Asignar ${validRows.length} tareas`}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
