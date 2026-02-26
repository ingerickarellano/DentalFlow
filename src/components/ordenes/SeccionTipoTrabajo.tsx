import React from 'react';

interface SeccionTipoTrabajoProps {
  tipoTrabajo: string[];
  onChange: (tipos: string[]) => void;
}

const opcionesTipoTrabajo = [
  { value: 'corona_total', label: 'CORONA TOTAL' },
  { value: 'corona_parcial', label: 'CORONA PARCIAL (ONLAY)' },
  { value: 'incrustacion', label: 'INCRUSTACIÓN' },
  { value: 'protesis_fija', label: 'PROTESIS FIJA' },
  { value: 'provisional', label: 'PROVISIONAL' },
  { value: 'respaldo_maryland', label: 'RESPALDO MARY LAND' },
  { value: 'poste', label: 'POSTE' },
  { value: 'carilla', label: 'CARILLA' },
  { value: 'estratificada', label: 'ESTRATIFICADA' },
  { value: 'implantologia', label: 'IMPLANTOLOGÍA' },
  { value: 'planeacion', label: 'PLANEACIÓN' },
  { value: 'rehabilitacion', label: 'REHABILITACIÓN' },
  { value: 'pilar_protestico', label: 'PILAR PROTÉSICO' }
];

const SeccionTipoTrabajo: React.FC<SeccionTipoTrabajoProps> = ({ tipoTrabajo, onChange }) => {
  const toggleTipo = (value: string) => {
    if (tipoTrabajo.includes(value)) {
      onChange(tipoTrabajo.filter(v => v !== value));
    } else {
      onChange([...tipoTrabajo, value]);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>TIPO DE TRABAJO</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {opcionesTipoTrabajo.map(op => (
          <label key={op.value} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={tipoTrabajo.includes(op.value)}
              onChange={() => toggleTipo(op.value)}
            />
            {op.label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default SeccionTipoTrabajo;