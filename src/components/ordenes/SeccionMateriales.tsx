import React from 'react';

interface SeccionMaterialesProps {
  materiales: string[];
  onChange: (campo: string, valor: any) => void;
}

// Lista de materiales según la imagen (puedes ajustar)
const listaMateriales = [
  'ALEACIÓN METAL CERAMICO',
  'ALEACIÓN ORO CERAMICO',
  'ALEACIÓN PLATA PALADIO',
  'METAL NPG + 2',
  'METAL CERAMICA STANDARD',
  'METAL CERAMICA ALTA ESTÉTICA',
  'E-MAX MAQUILLADA',
  'E-MAX ESTRATIFICADA',
  'ZIRCONITIA (CAD-CAM) MONOLÍTICA TRASLUCIDA',
  'ZIRCONIA (CAD-CAM) NUCLEO',
  'ZIRCONIA (CAD-CAM) CORONA',
  'ENAMIC (VITA)',
  'SUPRINTY (VITA)',
  'VITA VMLC (CEROMERO)',
  'ACRILICO RÁPIDO',
  'TERMOICURABLE',
  'CAPAS',
  'CAD - CAM'
];

const SeccionMateriales: React.FC<SeccionMaterialesProps> = ({ materiales, onChange }) => {
  const toggleMaterial = (material: string) => {
    const nuevos = materiales.includes(material)
      ? materiales.filter(m => m !== material)
      : [...materiales, material];
    onChange('materiales', nuevos);
  };

  return (
    <div style={{ marginBottom: '2rem', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '0.5rem' }}>
      <h3 style={{ marginTop: 0, color: '#2563eb' }}>MATERIALES</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
        {listaMateriales.map(material => (
          <label key={material} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={materiales.includes(material)}
              onChange={() => toggleMaterial(material)}
            />
            {material}
          </label>
        ))}
      </div>
    </div>
  );
};

export default SeccionMateriales;