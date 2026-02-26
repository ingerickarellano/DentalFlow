import React from 'react';

interface SeccionUnidadesProps {
  unidades: {
    collar_metalico: boolean;
    metal_porcelana: boolean;
    collar_less: boolean;
  };
  onChange: (campo: string, valor: any) => void;
}

const SeccionUnidades: React.FC<SeccionUnidadesProps> = ({ unidades, onChange }) => {
  const handleChange = (tipo: keyof typeof unidades) => {
    onChange('unidades', { ...unidades, [tipo]: !unidades[tipo] });
  };

  return (
    <div style={{ marginBottom: '2rem', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.5rem' }}>
      <h3 style={{ marginTop: 0, color: '#2563eb' }}>UNIDADES</h3>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <label>
          <input
            type="checkbox"
            checked={unidades.collar_metalico}
            onChange={() => handleChange('collar_metalico')}
          /> Collar metálico
        </label>
        <label>
          <input
            type="checkbox"
            checked={unidades.metal_porcelana}
            onChange={() => handleChange('metal_porcelana')}
          /> Metal - Porcelana
        </label>
        <label>
          <input
            type="checkbox"
            checked={unidades.collar_less}
            onChange={() => handleChange('collar_less')}
          /> Collar less
        </label>
      </div>
    </div>
  );
};

export default SeccionUnidades;