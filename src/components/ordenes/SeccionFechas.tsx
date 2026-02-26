import React from 'react';

interface SeccionFechasProps {
  diaEntrada: string;
  pruebaFecha: string;
  pruebaHora: string;
  fechaEntregaEstimada: string;
  terminado: boolean;
  onChange: (campo: string, valor: any) => void;
}

const SeccionFechas: React.FC<SeccionFechasProps> = ({
  diaEntrada,
  pruebaFecha,
  pruebaHora,
  fechaEntregaEstimada,
  terminado,
  onChange
}) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>FECHAS</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>DÍA DE ENTRADA</label>
          <input
            type="date"
            value={diaEntrada}
            onChange={(e) => onChange('dia_entrada', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>PRUEBA FECHA</label>
          <input
            type="date"
            value={pruebaFecha}
            onChange={(e) => onChange('prueba_fecha', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>PRUEBA HORA</label>
          <input
            type="time"
            value={pruebaHora}
            onChange={(e) => onChange('prueba_hora', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>FECHA ENTREGA ESTIMADA</label>
          <input
            type="date"
            value={fechaEntregaEstimada}
            onChange={(e) => onChange('fecha_entrega_estimada', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>
      <div style={{ marginTop: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={terminado}
            onChange={(e) => onChange('terminado', e.target.checked)}
          /> TERMINADO
        </label>
      </div>
    </div>
  );
};

export default SeccionFechas;