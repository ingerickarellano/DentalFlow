import React from 'react';

interface SelectorDientesProps {
  seleccionados: number[];
  onChange: (nuevos: number[]) => void;
}

// Numeración FDI (estándar)
const dientesSuperiores = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const dientesInferiores = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

const SelectorDientes: React.FC<SelectorDientesProps> = ({ seleccionados, onChange }) => {
  const toggleDiente = (diente: number) => {
    if (seleccionados.includes(diente)) {
      onChange(seleccionados.filter(d => d !== diente));
    } else {
      onChange([...seleccionados, diente]);
    }
  };

  const renderArcada = (dientes: number[], titulo: string) => (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>{titulo}</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
        {dientes.map(num => {
          const seleccionado = seleccionados.includes(num);
          return (
            <button
              key={num}
              type="button"
              onClick={() => toggleDiente(num)}
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                border: seleccionado ? '3px solid #3b82f6' : '1px solid #cbd5e1',
                backgroundColor: seleccionado ? '#dbeafe' : 'white',
                color: seleccionado ? '#1e40af' : '#334155',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: seleccionado ? '0 4px 6px rgba(59,130,246,0.3)' : 'none',
                transition: 'all 0.2s'
              }}
              title={`Diente ${num}`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ textAlign: 'center' }}>
      {renderArcada(dientesSuperiores, 'Arcada Superior')}
      {renderArcada(dientesInferiores, 'Arcada Inferior')}
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '10px' }}>
        {seleccionados.length} diente(s) seleccionado(s)
      </p>
    </div>
  );
};

export default SelectorDientes;