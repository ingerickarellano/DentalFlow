import React from 'react';

interface SeccionObservacionesProps {
  observaciones: string;
  usadoManda: {
    cucharilla: boolean;
    modelo_parcial: boolean;
    modelo_total: boolean;
    articulador: boolean;
    antagonista: boolean;
    rel_inter_oclusal: boolean;
  };
  onChange: (campo: string, valor: any) => void;
}

const SeccionObservaciones: React.FC<SeccionObservacionesProps> = ({
  observaciones,
  usadoManda,
  onChange
}) => {
  const handleUsadoMandaChange = (key: keyof typeof usadoManda) => {
    onChange('usado_manda', { ...usadoManda, [key]: !usadoManda[key] });
  };

  return (
    <div style={{ marginBottom: '2rem', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.5rem' }}>
      <h3 style={{ marginTop: 0, color: '#2563eb' }}>OBSERVACIONES</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <textarea
          value={observaciones}
          onChange={(e) => onChange('observaciones', e.target.value)}
          placeholder="Escribe observaciones adicionales..."
          rows={4}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', resize: 'vertical' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>USADO MANDA</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
          <label>
            <input
              type="checkbox"
              checked={usadoManda.cucharilla}
              onChange={() => handleUsadoMandaChange('cucharilla')}
            /> Cucharilla
          </label>
          <label>
            <input
              type="checkbox"
              checked={usadoManda.modelo_parcial}
              onChange={() => handleUsadoMandaChange('modelo_parcial')}
            /> Modelo parcial
          </label>
          <label>
            <input
              type="checkbox"
              checked={usadoManda.modelo_total}
              onChange={() => handleUsadoMandaChange('modelo_total')}
            /> Modelo total
          </label>
          <label>
            <input
              type="checkbox"
              checked={usadoManda.articulador}
              onChange={() => handleUsadoMandaChange('articulador')}
            /> Articulador
          </label>
          <label>
            <input
              type="checkbox"
              checked={usadoManda.antagonista}
              onChange={() => handleUsadoMandaChange('antagonista')}
            /> Antagonista
          </label>
          <label>
            <input
              type="checkbox"
              checked={usadoManda.rel_inter_oclusal}
              onChange={() => handleUsadoMandaChange('rel_inter_oclusal')}
            /> Rel. inter oclusal
          </label>
        </div>
      </div>
    </div>
  );
};

export default SeccionObservaciones;