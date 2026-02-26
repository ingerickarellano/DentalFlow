import React from "react";

type Superficie =
  | "oclusal"
  | "mesial"
  | "distal"
  | "vestibular"
  | "lingual";

type TipoTrabajo = "incrustacion" | "corona" | "puente" | null;

interface PiezaDental {
  seleccionado: boolean;
  tipo: TipoTrabajo;
  superficies: Record<Superficie, TipoTrabajo | null>;
}

interface Props {
  piezas: Record<number, PiezaDental>;
  onClickSuperficie: (
    num: number,
    superficie: Superficie,
    tipo: TipoTrabajo
  ) => void;
}

const dientes = [
  18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
  48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38
];

const getColor = (tipo: TipoTrabajo) => {
  if (tipo === "incrustacion") return "#ef4444";
  if (tipo === "corona") return "#3b82f6";
  if (tipo === "puente") return "#10b981";
  return "#ffffff";
};

const Tooth = ({
  x,
  y,
  num,
  pieza,
  onClickSuperficie,
}: any) => {
  const size = 40;

  const surf = pieza?.superficies || {};

  return (
    <g transform={`translate(${x}, ${y})`} style={{ cursor: "pointer" }}>
      
      {/* Oclusal */}
      <rect
        x={-10}
        y={-10}
        width={20}
        height={20}
        fill={getColor(surf.oclusal)}
        stroke="#1e293b"
        onClick={() => onClickSuperficie(num, "oclusal", surf.oclusal)}
      />

      {/* Mesial */}
      <rect
        x={-20}
        y={-10}
        width={10}
        height={20}
        fill={getColor(surf.mesial)}
        stroke="#1e293b"
        onClick={() => onClickSuperficie(num, "mesial", surf.mesial)}
      />

      {/* Distal */}
      <rect
        x={10}
        y={-10}
        width={10}
        height={20}
        fill={getColor(surf.distal)}
        stroke="#1e293b"
        onClick={() => onClickSuperficie(num, "distal", surf.distal)}
      />

      {/* Vestibular */}
      <rect
        x={-10}
        y={-20}
        width={20}
        height={10}
        fill={getColor(surf.vestibular)}
        stroke="#1e293b"
        onClick={() => onClickSuperficie(num, "vestibular", surf.vestibular)}
      />

      {/* Lingual */}
      <rect
        x={-10}
        y={10}
        width={20}
        height={10}
        fill={getColor(surf.lingual)}
        stroke="#1e293b"
        onClick={() => onClickSuperficie(num, "lingual", surf.lingual)}
      />

      <text
        x={0}
        y={35}
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
      >
        {num}
      </text>
    </g>
  );
};

const OdontogramaSuperficies: React.FC<Props> = ({
  piezas,
  onClickSuperficie,
}) => {

  const radius = 200;
  const centerX = 350;
  const centerY = 220;
  const angleStep = 360 / dientes.length;

  return (
    <svg width="100%" height="500" viewBox="0 0 700 500">
      {dientes.map((num, index) => {
        const angle = (angleStep * index) * (Math.PI / 180);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        return (
          <Tooth
            key={num}
            x={x}
            y={y}
            num={num}
            pieza={piezas[num]}
            onClickSuperficie={(n: number, s: Superficie, actual: TipoTrabajo) => {
              const tipos: TipoTrabajo[] = ["incrustacion","corona","puente"];
              const currentIndex = actual ? tipos.indexOf(actual) : -1;
              const nextIndex = (currentIndex + 1) % tipos.length;
              onClickSuperficie(n, s, tipos[nextIndex]);
            }}
          />
        );
      })}
    </svg>
  );
};

export default OdontogramaSuperficies;