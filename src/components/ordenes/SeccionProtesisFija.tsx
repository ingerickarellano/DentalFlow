import React from 'react';

interface SeccionProtesisFijaProps {
  disenoMetalPorcelana: 'ovoideo' | 'punta_flauta' | 'otro' | '';
  disenoPontico: string;
  desgasteEncia: boolean;
  desgasteEnciaMm: number | null;
  onChange: (campo: string, valor: any) => void;
}

const SeccionProtesisFija: React.FC<SeccionProtesisFijaProps> = ({
  disenoMetalPorcelana,
  disenoPontico,
  desgasteEncia,
  desgasteEnciaMm,
  onChange
}) => {
  return (
    <div style={{ marginBottom: '2rem', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.5rem' }}>
      <h3 style={{ marginTop: 0, color: '#2563eb' }}>PRÓTESIS FIJA</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>DISEÑO METAL PORCELANA</label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label>
            <input
              type="radio"
              name="disenoMetalPorcelana"
              value="ovoideo"
              checked={disenoMetalPorcelana === 'ovoideo'}
              onChange={(e) => onChange('diseno_metal_porcelana', e.target.value)}
            /> Ovoideo
          </label>
          <label>
            <input
              type="radio"
              name="disenoMetalPorcelana"
              value="punta_flauta"
              checked={disenoMetalPorcelana === 'punta_flauta'}
              onChange={(e) => onChange('diseno_metal_porcelana', e.target.value)}
            /> Punta de flauta
          </label>
          <label>
            <input
              type="radio"
              name="disenoMetalPorcelana"
              value="otro"
              checked={disenoMetalPorcelana === 'otro'}
              onChange={(e) => onChange('diseno_metal_porcelana', e.target.value)}
            /> Otro
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>DISEÑO DE PONTICO</label>
        <input
          type="text"
          value={disenoPontico}
          onChange={(e) => onChange('diseno_pontico', e.target.value)}
          placeholder="Ej: Desgaste de encía, etc."
          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>DESGASTE DE ENCÍA</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label>
            <input
              type="radio"
              name="desgasteEncia"
              checked={desgasteEncia === true}
              onChange={() => onChange('desgaste_encia', true)}
            /> Sí
          </label>
          <label>
            <input
              type="radio"
              name="desgasteEncia"
              checked={desgasteEncia === false}
              onChange={() => onChange('desgaste_encia', false)}
            /> No
          </label>
          {desgasteEncia && (
            <label>
              mm:
              <input
                type="number"
                step="0.01"
                value={desgasteEnciaMm || ''}
                onChange={(e) => onChange('desgaste_encia_mm', e.target.value ? parseFloat(e.target.value) : null)}
                style={{ width: '80px', marginLeft: '0.5rem', padding: '0.25rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeccionProtesisFija;