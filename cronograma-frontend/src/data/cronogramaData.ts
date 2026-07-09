// ============================================================
// Cronograma WBS completo — generado desde Excel
//   Estructura: 'Cronog 19 mar'
//   Avance programado: 'Programado 19 mar'
//   Avance real: 'Cortes 19 mar' (corte 01 Abr 2026)
//   Total: 515 actividades | 12 capitulos principales
// ============================================================

export interface Activity {
  code: string;
  name: string;
  peso: number;
  inicio: string;
  fin: string;
  duracion: string;
  avanceProg: number;
  avanceReal: number;
  children?: Activity[];
}

const cronograma: Activity[] = [
    {
      code: '1', name: 'NO OBJECIÓN TMSA - EPC',
      peso: 0.01, inicio: '2025-06-21', fin: '2025-07-15', duracion: '24 días',
      avanceProg: 100.0, avanceReal: 100.0,
    },
    {
      code: '2', name: 'TRÁMITES DE EJECUCIÓN',
      peso: 0.05, inicio: '2025-06-20', fin: '2026-04-23', duracion: '307 días',
      avanceProg: 90.8, avanceReal: 100.0,
      children: [
        {
          code: '2.1', name: 'Plan de manejo de tránsito',
          peso: 0.25, inicio: '2026-02-22', fin: '2026-04-23', duracion: '60 días',
          avanceProg: 63.3, avanceReal: 100.0,
        },
        {
          code: '2.2', name: 'Licencia de intervención y ocupación de espacio público',
          peso: 0.25, inicio: '2025-12-12', fin: '2026-01-26', duracion: '45 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '2.3', name: 'DISEÑO Y APROBACIÓN DE SERIES ANTE CODENSA',
          peso: 0.5, inicio: '2025-06-20', fin: '2026-03-11', duracion: '264 días',
          avanceProg: 100.0, avanceReal: 100.0,
          children: [
            {
              code: '2.3.1', name: 'Previos Codensa',
              peso: 0.1, inicio: '2025-06-20', fin: '2025-10-15', duracion: '117 días',
              avanceProg: 100.0, avanceReal: 100.0,
              children: [
                {
                  code: '2.3.1.1', name: 'Factibilidad Codensa',
                  peso: 1.0, inicio: '2025-06-20', fin: '2025-10-15', duracion: '117 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                  children: [
                    {
                      code: '2.3.1.1.1', name: 'Factibilidad 1 (13MVA)',
                      peso: 0.5, inicio: '2025-06-20', fin: '2025-06-20', duracion: '0 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '2.3.1.1.2', name: 'Factibilidad 2 (9MVA)',
                      peso: 0.5, inicio: '2025-10-15', fin: '2025-10-15', duracion: '0 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                  ],
                },
              ],
            },
            {
              code: '2.3.2', name: 'Aprobación estudios puesta en servicio',
              peso: 0.4, inicio: '2025-10-22', fin: '2026-03-11', duracion: '140 días',
              avanceProg: 100.0, avanceReal: 100.0,
              children: [
                {
                  code: '2.3.2.1', name: 'Estudio de coordinación de protecciones en MT solicitado por CODENSA',
                  peso: 0.2, inicio: '2025-10-22', fin: '2025-11-22', duracion: '31 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.2.2', name: 'Estudio de Puesta en servicio solicitado por CODENSA (HIJAS AGREGADAS)',
                  peso: 0.8, inicio: '2025-11-24', fin: '2026-03-11', duracion: '107 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                  children: [
                    {
                      code: '2.3.2.2.1', name: 'Radicación y Revisión 1',
                      peso: 0.15, inicio: '2025-11-24', fin: '2025-11-24', duracion: '0 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '2.3.2.2.2', name: 'Devolución Revisión 1',
                      peso: 0.1, inicio: '2025-11-24', fin: '2025-11-29', duracion: '5 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '2.3.2.2.3', name: 'Correcciones 1',
                      peso: 0.15, inicio: '2025-11-29', fin: '2025-12-03', duracion: '4 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '2.3.2.2.4', name: 'Radicación #2 (RENOMBRADO)',
                      peso: 0.1, inicio: '2026-02-02', fin: '2026-02-03', duracion: '1 día',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '2.3.2.2.5', name: 'Devolución Revisión #2 (NUEVA)',
                      peso: 0.1, inicio: '2026-02-09', fin: '2026-02-09', duracion: '0 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '2.3.2.2.6', name: 'Radicación #3 (NUEVA)',
                      peso: 0.1, inicio: '2026-02-17', fin: '2026-02-17', duracion: '0 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '2.3.2.2.7', name: 'Aprobación',
                      peso: 0.3, inicio: '2026-03-10', fin: '2026-03-11', duracion: '1 día',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                  ],
                },
              ],
            },
            {
              code: '2.3.3', name: 'Serie 3',
              peso: 0.5, inicio: '2025-06-20', fin: '2026-03-11', duracion: '264 días',
              avanceProg: 100.0, avanceReal: 100.0,
              children: [
                {
                  code: '2.3.3.1', name: 'Elaboración proyecto serie',
                  peso: 0.05, inicio: '2025-06-20', fin: '2025-08-04', duracion: '45 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.2', name: 'Radicación proyecto serie',
                  peso: 0.05, inicio: '2025-09-30', fin: '2025-10-01', duracion: '1 día',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.3', name: 'Devolución Revisión 1',
                  peso: 0.05, inicio: '2025-10-01', fin: '2025-10-03', duracion: '2 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.4', name: 'Correcciones 1',
                  peso: 0.1, inicio: '2025-10-03', fin: '2025-10-08', duracion: '5 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.5', name: 'Radicación correcciones 1',
                  peso: 0.05, inicio: '2025-10-08', fin: '2025-10-08', duracion: '0 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.6', name: 'Cierre radicación #1',
                  peso: 0.05, inicio: '2025-10-08', fin: '2025-10-22', duracion: '14 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.7', name: 'Radicación #2',
                  peso: 0.1, inicio: '2025-10-27', fin: '2025-10-27', duracion: '0 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.8', name: 'Devolución Revisión #2',
                  peso: 0.05, inicio: '2025-10-27', fin: '2025-10-28', duracion: '1 día',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.9', name: 'Correcciones #2',
                  peso: 0.1, inicio: '2025-10-28', fin: '2025-11-04', duracion: '7 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.10', name: 'Radicación correcciones #2',
                  peso: 0.05, inicio: '2025-11-13', fin: '2025-11-13', duracion: '0 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.11', name: 'Definición carga instalada para radicación de serie por TMSA',
                  peso: 0.05, inicio: '2025-11-13', fin: '2025-11-13', duracion: '0 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.12', name: 'Cierre radicación #2',
                  peso: 0.05, inicio: '2025-11-13', fin: '2025-11-21', duracion: '8 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.13', name: 'Radicación #3',
                  peso: 0.05, inicio: '2026-01-26', fin: '2026-01-26', duracion: '0 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.14', name: 'Corrección #3 (NUEVA)',
                  peso: 0.05, inicio: '2026-03-08', fin: '2026-03-10', duracion: '2 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '2.3.3.15', name: 'Aprobación',
                  peso: 0.15, inicio: '2026-03-10', fin: '2026-03-11', duracion: '1 día',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      code: '3', name: 'DISEÑO CIVIL - ARQUITECTÓNICO',
      peso: 0.1, inicio: '2025-10-22', fin: '2026-04-03', duracion: '163 días',
      avanceProg: 98.2, avanceReal: 100.0,
      children: [
        {
          code: '3.1', name: 'Estructura metálica',
          peso: 0.4, inicio: '2026-01-08', fin: '2026-02-04', duracion: '27 días',
          avanceProg: 100.0, avanceReal: 100.0,
          children: [
            {
              code: '3.1.1', name: 'Elaboración de diseño estructura metalica',
              peso: 0.6, inicio: '2026-01-08', fin: '2026-01-21', duracion: '13 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.1.2', name: 'Aprobación diseño estructura cliente',
              peso: 0.2, inicio: '2026-01-26', fin: '2026-01-31', duracion: '5 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.1.3', name: 'Desarrollo planos taller',
              peso: 0.2, inicio: '2026-01-31', fin: '2026-02-04', duracion: '4 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
          ],
        },
        {
          code: '3.2', name: 'Estudio de suelos',
          peso: 0.2, inicio: '2025-10-22', fin: '2025-12-04', duracion: '43 días',
          avanceProg: 100.0, avanceReal: 100.0,
          children: [
            {
              code: '3.2.1', name: 'Remisión de la documentación',
              peso: 0.05, inicio: '2025-10-22', fin: '2025-10-29', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.2.2', name: 'Aprobación documentación (PC)',
              peso: 0.05, inicio: '2025-10-29', fin: '2025-10-29', duracion: '0 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.2.3', name: 'Aprobación documentación (CEX)',
              peso: 0.05, inicio: '2025-10-29', fin: '2025-11-04', duracion: '6 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.2.4', name: 'Línea de refracción',
              peso: 0.05, inicio: '2025-11-09', fin: '2025-11-10', duracion: '1 día',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.2.5', name: 'Perforaciones',
              peso: 0.4, inicio: '2025-11-06', fin: '2025-11-11', duracion: '5 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.2.6', name: 'Ensayos de laboratorio',
              peso: 0.3, inicio: '2025-11-06', fin: '2025-11-21', duracion: '15 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.2.7', name: 'Informe Geotécnico',
              peso: 0.1, inicio: '2025-11-11', fin: '2025-12-04', duracion: '23 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
          ],
        },
        {
          code: '3.3', name: 'Diseño cimentaciones',
          peso: 0.4, inicio: '2025-12-04', fin: '2026-04-03', duracion: '120 días',
          avanceProg: 95.5, avanceReal: 100.0,
          children: [
            {
              code: '3.3.1', name: 'Prediseño cimentaciones estructuras + subestaciones',
              peso: 0.2, inicio: '2025-12-04', fin: '2025-12-05', duracion: '1 día',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.3.2', name: 'Cimentaciones estructuras metálica',
              peso: 0.45, inicio: '2026-03-14', fin: '2026-04-03', duracion: '20 días',
              avanceProg: 90.0, avanceReal: 100.0,
            },
            {
              code: '3.3.3', name: 'Cimentaciones subestaciones',
              peso: 0.2, inicio: '2025-12-04', fin: '2025-12-24', duracion: '20 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '3.3.4', name: 'Rediseño cimentación subestaciones por cambio de uso (NUEVA)',
              peso: 0.15, inicio: '2026-03-10', fin: '2026-03-26', duracion: '16 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
          ],
        },
      ],
    },
    {
      code: '4', name: 'DISEÑO ELÉCTRICO',
      peso: 0.1, inicio: '2025-06-25', fin: '2026-02-06', duracion: '226 días',
      avanceProg: 100.0, avanceReal: 100.0,
      children: [
        {
          code: '4.1', name: 'Diseño internas (Derivación SE Ppal 34,5kV) (Semana 20)',
          peso: 0.6, inicio: '2025-06-25', fin: '2026-02-06', duracion: '226 días',
          avanceProg: 100.0, avanceReal: 100.0,
          children: [
            {
              code: '4.1.1', name: 'Definición tipo de carga patios: secuencial o simultánea - cantidad cargadores - tipo de conector - cotizaciones - comparativos ptales eléctricos (Semana 2)',
              peso: 0.05, inicio: '2025-06-25', fin: '2025-07-05', duracion: '10 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.2', name: 'Definición Capacidades transformadores, cargadores, alimentadores.',
              peso: 0.05, inicio: '2025-07-02', fin: '2025-07-05', duracion: '3 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.3', name: 'Diseño cuartos técnicos: Subestaciones cargadores, tableros de distribución, shelters. (Celdas MT, BT, banco condensadores)',
              peso: 0.15, inicio: '2025-06-30', fin: '2025-07-10', duracion: '10 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.4', name: 'Diseño de alimentadores y tableros de distribución: cableado, alimentación cargadores, unifilares',
              peso: 0.1, inicio: '2025-06-30', fin: '2025-07-05', duracion: '5 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.5', name: 'Medida de resistividad',
              peso: 0.05, inicio: '2025-12-04', fin: '2025-12-05', duracion: '1 día',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.6', name: 'Diseño de malla de puesta a tierra',
              peso: 0.05, inicio: '2026-02-03', fin: '2026-02-04', duracion: '1 día',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.7', name: 'Diseño de apantallamiento',
              peso: 0.05, inicio: '2026-01-31', fin: '2026-02-04', duracion: '4 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.8', name: 'Diseño de rutas canalizaciones y cajas de distribución.',
              peso: 0.05, inicio: '2025-06-25', fin: '2025-06-29', duracion: '4 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.9', name: 'Diseño de iluminación',
              peso: 0.05, inicio: '2026-01-27', fin: '2026-02-01', duracion: '5 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.10', name: 'Diseño de tomas en subestaciones',
              peso: 0.05, inicio: '2025-11-25', fin: '2025-11-30', duracion: '5 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.11', name: 'Diseño de redes comunicaciones canalizaciones, dimensionamiento y especificación fibra, cableado UTP a cargadores',
              peso: 0.1, inicio: '2025-10-11', fin: '2025-12-10', duracion: '60 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.12', name: 'Elaboración de memorias de cálculo de acuerdo a RETIE 10.1',
              peso: 0.1, inicio: '2025-12-16', fin: '2025-12-24', duracion: '8 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.13', name: 'Elaboración de Manual de especificaciones técnicas',
              peso: 0.1, inicio: '2026-02-04', fin: '2026-02-06', duracion: '2 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.1.14', name: 'Elaboración de cantidades de obra',
              peso: 0.05, inicio: '2025-07-17', fin: '2025-07-22', duracion: '5 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
          ],
        },
        {
          code: '4.2', name: 'Diseño geométrico',
          peso: 0.4, inicio: '2025-10-03', fin: '2026-01-31', duracion: '120 días',
          avanceProg: 100.0, avanceReal: 100.0,
          children: [
            {
              code: '4.2.1', name: 'Diseño conceptual',
              peso: 0.5, inicio: '2025-10-03', fin: '2025-10-27', duracion: '24 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.2.2', name: 'Aprobación del diseño conceptual',
              peso: 0.3, inicio: '2025-10-27', fin: '2025-10-30', duracion: '3 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '4.2.3', name: 'Diseño de señalización',
              peso: 0.2, inicio: '2025-12-16', fin: '2026-01-31', duracion: '46 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
          ],
        },
      ],
    },
    {
      code: '5', name: 'NO OBJECIÓN TMSA - DISEÑO',
      peso: 0.01, inicio: '2025-10-28', fin: '2026-03-09', duracion: '132 días',
      avanceProg: 100.0, avanceReal: 90.0,
      children: [
        {
          code: '5.1', name: 'Radicación #1 diseños',
          peso: 0.2, inicio: '2025-10-28', fin: '2025-10-28', duracion: '0 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '5.2', name: 'Radicación #2 diseños',
          peso: 0.2, inicio: '2025-12-22', fin: '2025-12-26', duracion: '4 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '5.3', name: 'Revisión #1 TMSA (RENOMBRADA)',
          peso: 0.1, inicio: '2025-12-26', fin: '2026-01-22', duracion: '27 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '5.4', name: 'Radicación #3 diseños (NUEVA)',
          peso: 0.2, inicio: '2026-02-04', fin: '2026-02-04', duracion: '0 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '5.5', name: 'Revisión #3 TMSA (NUEVA)',
          peso: 0.1, inicio: '2026-02-04', fin: '2026-02-13', duracion: '9 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '5.6', name: 'Subsanación a radicación #3 diseños (NUEVA)',
          peso: 0.1, inicio: '2026-02-27', fin: '2026-02-27', duracion: '0 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '5.7', name: 'Revisión de la subsanación de la radicación #3 TMSA (NUEVA)',
          peso: 0.1, inicio: '2026-02-27', fin: '2026-03-09', duracion: '10 días',
          avanceProg: 100.0, avanceReal: 0.0,
        },
      ],
    },
    {
      code: '6', name: 'PRESUPUESTO',
      peso: 0.01, inicio: '2025-07-22', fin: '2025-10-29', duracion: '99 días',
      avanceProg: 100.0, avanceReal: 100.0,
      children: [
        {
          code: '6.1', name: 'Elaboración presupuesto final de obra',
          peso: 1.0, inicio: '2025-07-22', fin: '2025-10-29', duracion: '99 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
      ],
    },
    {
      code: '7', name: 'GESTIÓN DE COMPRA - EQUIPOS',
      peso: 0.15, inicio: '2025-09-15', fin: '2026-05-24', duracion: '251 días',
      avanceProg: 81.4, avanceReal: 69.3,
      children: [
        {
          code: '7.1', name: 'Cargadores',
          peso: 0.14, inicio: '2025-10-26', fin: '2026-03-31', duracion: '156 días',
          avanceProg: 100.0, avanceReal: 75.0,
          children: [
            {
              code: '7.1.1', name: 'Evaluación y gestión de compra',
              peso: 0.1, inicio: '2025-10-26', fin: '2025-11-25', duracion: '30 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.1.2', name: 'Fabricación (8 semanas)',
              peso: 0.3, inicio: '2025-11-25', fin: '2026-01-20', duracion: '56 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.1.3', name: 'Transporte internacional isla 1 (6 semanas)',
              peso: 0.1, inicio: '2025-12-25', fin: '2026-02-04', duracion: '41 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.1.4', name: 'Transporte internacional isla 2 y 3 (6 semanas)',
              peso: 0.15, inicio: '2026-01-20', fin: '2026-02-04', duracion: '15 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.1.5', name: 'Certificación RETIE de producto (8 semanas)',
              peso: 0.1, inicio: '2026-01-18', fin: '2026-03-15', duracion: '56 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.1.6', name: 'Nacionalización isla 1 (2 semanas)',
              peso: 0.05, inicio: '2026-03-15', fin: '2026-03-29', duracion: '14 días',
              avanceProg: 100.0, avanceReal: 0.0,
            },
            {
              code: '7.1.7', name: 'Nacionalización isla 2 y 3 (2 semanas)',
              peso: 0.05, inicio: '2026-03-15', fin: '2026-03-29', duracion: '14 días',
              avanceProg: 100.0, avanceReal: 0.0,
            },
            {
              code: '7.1.8', name: 'Transporte local a patio isla 1 (1 semana)',
              peso: 0.05, inicio: '2026-03-29', fin: '2026-03-31', duracion: '2 días',
              avanceProg: 100.0, avanceReal: 0.0,
            },
            {
              code: '7.1.9', name: 'Transporte local a patio isla 2 y 3 (1 semana)',
              peso: 0.1, inicio: '2026-03-29', fin: '2026-03-31', duracion: '2 días',
              avanceProg: 100.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '7.2', name: 'Envolventes (RENOMBRADA)',
          peso: 0.14, inicio: '2025-09-15', fin: '2026-03-16', duracion: '182 días',
          avanceProg: 100.0, avanceReal: 100.0,
          children: [
            {
              code: '7.2.1', name: 'Evaluación y gestión de compra',
              peso: 0.1, inicio: '2025-09-15', fin: '2025-11-25', duracion: '71 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.2.2', name: 'Planos taller y diseño cimentaciones',
              peso: 0.2, inicio: '2026-01-22', fin: '2026-01-30', duracion: '8 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.2.3', name: 'Producción',
              peso: 0.4, inicio: '2026-01-30', fin: '2026-03-16', duracion: '45 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.2.4', name: 'Transporte local a patio (enlace e isla 1)',
              peso: 0.1, inicio: '2026-03-16', fin: '2026-03-16', duracion: '0 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.2.5', name: 'Transporte local a patio (isla 2)',
              peso: 0.1, inicio: '2026-03-16', fin: '2026-03-16', duracion: '0 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.2.6', name: 'Transporte local a patio (isla 3)',
              peso: 0.1, inicio: '2026-03-16', fin: '2026-03-16', duracion: '0 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
          ],
        },
        {
          code: '7.3', name: 'Transformadores',
          peso: 0.14, inicio: '2025-09-15', fin: '2026-05-07', duracion: '234 días',
          avanceProg: 92.5, avanceReal: 61.0,
          children: [
            {
              code: '7.3.1', name: 'Evaluación y gestión de compra',
              peso: 0.25, inicio: '2025-09-15', fin: '2025-11-24', duracion: '70 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.3.2', name: 'Producción',
              peso: 0.6, inicio: '2025-12-03', fin: '2026-03-23', duracion: '110 días',
              avanceProg: 100.0, avanceReal: 60.0,
            },
            {
              code: '7.3.3', name: 'Transporte local a patio - Isla 1 (RENOMBRADA)',
              peso: 0.075, inicio: '2026-03-23', fin: '2026-03-30', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 0.0,
            },
            {
              code: '7.3.4', name: 'Transporte local a patios - Isla 2 e Isla 3 (NUEVA)',
              peso: 0.075, inicio: '2026-04-30', fin: '2026-05-07', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '7.4', name: 'Celdas media tensión: seccionadores, interruptor, medida y TC',
          peso: 0.12, inicio: '2025-09-15', fin: '2026-03-02', duracion: '168 días',
          avanceProg: 100.0, avanceReal: 100.0,
          children: [
            {
              code: '7.4.1', name: 'Evaluación y gestión de compra',
              peso: 0.2, inicio: '2025-09-15', fin: '2025-11-25', duracion: '71 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.4.2', name: 'Producción',
              peso: 0.5, inicio: '2025-11-25', fin: '2026-02-23', duracion: '90 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.4.3', name: 'Transporte local a patio (enlace e isla 1)',
              peso: 0.1, inicio: '2026-02-23', fin: '2026-03-02', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.4.4', name: 'Transporte local a patio (isla 2)',
              peso: 0.1, inicio: '2026-02-23', fin: '2026-03-02', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.4.5', name: 'Transporte local a patio (isla 3)',
              peso: 0.1, inicio: '2026-02-23', fin: '2026-03-02', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
          ],
        },
        {
          code: '7.5', name: 'Celdas baja tensión',
          peso: 0.12, inicio: '2025-09-15', fin: '2026-04-10', duracion: '207 días',
          avanceProg: 66.6, avanceReal: 60.0,
          children: [
            {
              code: '7.5.1', name: 'Evaluación y gestión de compra',
              peso: 0.2, inicio: '2025-09-15', fin: '2025-11-25', duracion: '71 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.5.2', name: 'Producción',
              peso: 0.5, inicio: '2025-12-28', fin: '2026-04-08', duracion: '101 días',
              avanceProg: 93.1, avanceReal: 80.0,
            },
            {
              code: '7.5.3', name: 'Transporte local a patio (isla 1)',
              peso: 0.1, inicio: '2026-04-08', fin: '2026-04-10', duracion: '2 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '7.5.4', name: 'Transporte local a patio (isla 2)',
              peso: 0.1, inicio: '2026-04-08', fin: '2026-04-10', duracion: '2 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '7.5.5', name: 'Transporte local a patio (isla 3)',
              peso: 0.1, inicio: '2026-04-08', fin: '2026-04-10', duracion: '2 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '7.6', name: 'Estructura metálica',
          peso: 0.14, inicio: '2025-09-15', fin: '2026-05-04', duracion: '231 días',
          avanceProg: 58.3, avanceReal: 50.8,
          children: [
            {
              code: '7.6.1', name: 'Evaluación y gestión de compra',
              peso: 0.2, inicio: '2025-09-15', fin: '2025-11-25', duracion: '71 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.6.2', name: 'Producción',
              peso: 0.5, inicio: '2026-02-12', fin: '2026-04-23', duracion: '70 días',
              avanceProg: 76.7, avanceReal: 61.5,
              children: [
                {
                  code: '7.6.2.1', name: 'Corte y alistamiento de materiales',
                  peso: 0.4, inicio: '2026-02-12', fin: '2026-03-24', duracion: '40 días',
                  avanceProg: 100.0, avanceReal: 96.0,
                },
                {
                  code: '7.6.2.2', name: 'Armado y soldadura',
                  peso: 0.5, inicio: '2026-02-26', fin: '2026-04-18', duracion: '51 días',
                  avanceProg: 66.7, avanceReal: 45.0,
                },
                {
                  code: '7.6.2.3', name: 'Limpieza y pintura',
                  peso: 0.1, inicio: '2026-03-21', fin: '2026-04-23', duracion: '33 días',
                  avanceProg: 33.3, avanceReal: 6.0,
                },
              ],
            },
            {
              code: '7.6.3', name: 'Transporte local a patio (isla 1)',
              peso: 0.1, inicio: '2026-04-10', fin: '2026-04-11', duracion: '1 día',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '7.6.4', name: 'Transporte local a patio (isla 2)',
              peso: 0.1, inicio: '2026-04-25', fin: '2026-04-26', duracion: '1 día',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '7.6.5', name: 'Transporte local a patio (isla 3)',
              peso: 0.1, inicio: '2026-05-03', fin: '2026-05-04', duracion: '1 día',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '7.7', name: 'Equipos activos de comunicaciones',
          peso: 0.04, inicio: '2026-02-16', fin: '2026-05-23', duracion: '96 días',
          avanceProg: 34.2, avanceReal: 0.0,
          children: [
            {
              code: '7.7.1', name: 'Evaluación y gestión de compra',
              peso: 0.7, inicio: '2026-02-16', fin: '2026-05-17', duracion: '90 días',
              avanceProg: 48.9, avanceReal: 0.0,
            },
            {
              code: '7.7.2', name: 'Transporte local a patio',
              peso: 0.3, inicio: '2026-05-17', fin: '2026-05-23', duracion: '6 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '7.8', name: 'Luminarias',
          peso: 0.04, inicio: '2026-02-16', fin: '2026-05-24', duracion: '97 días',
          avanceProg: 34.2, avanceReal: 0.0,
          children: [
            {
              code: '7.8.1', name: 'Evaluación y gestión de compra',
              peso: 0.7, inicio: '2026-02-16', fin: '2026-05-17', duracion: '90 días',
              avanceProg: 48.9, avanceReal: 0.0,
            },
            {
              code: '7.8.2', name: 'Transporte local a patio',
              peso: 0.3, inicio: '2026-05-17', fin: '2026-05-24', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '7.9', name: 'Cable DC',
          peso: 0.04, inicio: '2026-01-11', fin: '2026-05-14', duracion: '123 días',
          avanceProg: 70.0, avanceReal: 80.0,
          children: [
            {
              code: '7.9.1', name: 'Evaluación y gestión de compra',
              peso: 0.2, inicio: '2026-01-11', fin: '2026-01-21', duracion: '10 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.9.2', name: 'Producción - certificación de producto - Protocolos y pruebas',
              peso: 0.5, inicio: '2026-01-21', fin: '2026-03-10', duracion: '48 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.9.3', name: 'Transporte local a patio (isla 1)',
              peso: 0.1, inicio: '2026-04-14', fin: '2026-04-21', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 100.0,
            },
            {
              code: '7.9.4', name: 'Transporte local a patio (isla 2)',
              peso: 0.1, inicio: '2026-04-29', fin: '2026-05-06', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '7.9.5', name: 'Transporte local a patio (isla 3)',
              peso: 0.1, inicio: '2026-05-07', fin: '2026-05-14', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '7.10', name: 'Cable AC-MT',
          peso: 0.04, inicio: '2026-01-28', fin: '2026-03-18', duracion: '49 días',
          avanceProg: 100.0, avanceReal: 100.0,
          children: [
            {
              code: '7.10.1', name: 'Evaluación y gestión de compra',
              peso: 0.2, inicio: '2026-01-28', fin: '2026-01-31', duracion: '3 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.10.2', name: 'Producción - certificación de producto - Protocolos y pruebas',
              peso: 0.5, inicio: '2026-01-31', fin: '2026-03-11', duracion: '39 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.10.3', name: 'Transporte local a patio (enlace e isla 1)',
              peso: 0.1, inicio: '2026-03-11', fin: '2026-03-18', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.10.4', name: 'Transporte local a patio (isla 2)',
              peso: 0.1, inicio: '2026-03-11', fin: '2026-03-18', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.10.5', name: 'Transporte local a patio (isla 3)',
              peso: 0.1, inicio: '2026-03-11', fin: '2026-03-18', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
          ],
        },
        {
          code: '7.11', name: 'Cable AC-BT',
          peso: 0.04, inicio: '2026-01-27', fin: '2026-05-11', duracion: '104 días',
          avanceProg: 70.0, avanceReal: 70.0,
          children: [
            {
              code: '7.11.1', name: 'Evaluación y gestión de compra',
              peso: 0.7, inicio: '2026-01-27', fin: '2026-02-01', duracion: '5 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '7.11.2', name: 'Transporte local a patio (enlace e isla 1)',
              peso: 0.1, inicio: '2026-05-04', fin: '2026-05-11', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '7.11.3', name: 'Transporte local a patio (isla 2)',
              peso: 0.1, inicio: '2026-05-04', fin: '2026-05-11', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '7.11.4', name: 'Transporte local a patio (isla 3)',
              peso: 0.1, inicio: '2026-04-28', fin: '2026-05-05', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
      ],
    },
    {
      code: '8', name: 'PREVIOS OBRA - ALISTAMIENTO DE RECURSOS Y EQUIPOS',
      peso: 0.01, inicio: '2025-10-27', fin: '2025-12-21', duracion: '55 días',
      avanceProg: 100.0, avanceReal: 100.0,
      children: [
        {
          code: '8.1', name: 'Preoperativos admin PC',
          peso: 0.05, inicio: '2025-10-29', fin: '2025-11-11', duracion: '13 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '8.2', name: 'Preoperativos logística PC',
          peso: 0.1, inicio: '2025-11-16', fin: '2025-12-21', duracion: '35 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '8.3', name: 'Propuesta plan operativo',
          peso: 0.1, inicio: '2025-10-27', fin: '2025-11-11', duracion: '15 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '8.4', name: 'Aprobación plan operativo',
          peso: 0.3, inicio: '2025-11-12', fin: '2025-11-17', duracion: '5 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '8.5', name: 'Propuesta plan ambiental',
          peso: 0.05, inicio: '2025-11-12', fin: '2025-11-27', duracion: '15 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '8.6', name: 'Aprobación Plan ambiental',
          peso: 0.1, inicio: '2025-11-28', fin: '2025-12-03', duracion: '5 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '8.7', name: 'Reunión de inicio de obra (definir ubicación de materiales, de RRHH, disposición de residuos y SST)',
          peso: 0.3, inicio: '2025-11-28', fin: '2025-11-30', duracion: '2 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
      ],
    },
    {
      code: '9', name: 'LIBERACIÓN DE ESPACIOS',
      peso: 0.01, inicio: '2025-11-20', fin: '2026-04-17', duracion: '148 días',
      avanceProg: 68.0, avanceReal: 46.0,
      children: [
        {
          code: '9.1', name: 'Liberación espacio campamento administrativo',
          peso: 0.05, inicio: '2025-11-20', fin: '2025-11-21', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '9.2', name: 'Liberación de espacio para canalizaciones red MT - zonas blandas',
          peso: 0.05, inicio: '2025-11-25', fin: '2025-11-26', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '9.3', name: 'Liberación de espacio Subestación de Enlace',
          peso: 0.06, inicio: '2025-12-04', fin: '2025-12-05', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '9.4', name: 'Liberación de espacio Isla 1 - espacio subestaciones',
          peso: 0.06, inicio: '2025-12-01', fin: '2025-12-02', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '9.5', name: 'Liberación de espacio Isla 2 - espacio subestaciones',
          peso: 0.06, inicio: '2025-12-01', fin: '2025-12-02', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '9.6', name: 'Liberación de espacio Isla 3 - espacio subestaciones',
          peso: 0.06, inicio: '2025-12-01', fin: '2025-12-02', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '9.7', name: 'Liberación de espacio isla 1 - Zona izquierda de SE - Estructura',
          peso: 0.06, inicio: '2026-01-19', fin: '2026-01-20', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '9.8', name: 'Liberación isla 1 - Zona derecha de SE (isla completa)',
          peso: 0.06, inicio: '2026-03-06', fin: '2026-03-07', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '9.9', name: 'Liberación de espacio isla 2 - Zona izquierda de SE - Estructura',
          peso: 0.06, inicio: '2026-03-18', fin: '2026-03-19', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 0.0,
        },
        {
          code: '9.10', name: 'Liberación isla 2 - Zona derecha de SE (isla completa)',
          peso: 0.16, inicio: '2026-03-18', fin: '2026-03-19', duracion: '1 día',
          avanceProg: 100.0, avanceReal: 0.0,
        },
        {
          code: '9.11', name: 'Liberación de espacio isla 3 - Zona izquierda de SE - Estructura',
          peso: 0.16, inicio: '2026-04-16', fin: '2026-04-17', duracion: '1 día',
          avanceProg: 0.0, avanceReal: 0.0,
        },
        {
          code: '9.12', name: 'Liberación isla 3 - Zona derecha de SE (isla completa)',
          peso: 0.16, inicio: '2026-04-16', fin: '2026-04-17', duracion: '1 día',
          avanceProg: 0.0, avanceReal: 0.0,
        },
      ],
    },
    {
      code: '10', name: 'EJECUCIÓN',
      peso: 0.5, inicio: '2025-10-01', fin: '2026-06-30', duracion: '272 días',
      avanceProg: 32.2, avanceReal: 31.9,
      children: [
        {
          code: '10.1', name: 'Evento Primera Piedra',
          peso: 0.02, inicio: '2025-12-04', fin: '2025-12-04', duracion: '0 días',
          avanceProg: 100.0, avanceReal: 100.0,
        },
        {
          code: '10.2', name: 'Campamento de obra',
          peso: 0.05, inicio: '2025-11-20', fin: '2026-05-01', duracion: '162 días',
          avanceProg: 75.0, avanceReal: 100.0,
          children: [
            {
              code: '10.2.1', name: 'Provisional de obra campamento administrativo',
              peso: 0.25, inicio: '2025-11-20', fin: '2025-11-25', duracion: '5 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.2.2', name: 'Provisionales de obra isla 1',
              peso: 0.25, inicio: '2026-03-20', fin: '2026-03-22', duracion: '2 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.2.3', name: 'Provisionales de obra isla 2',
              peso: 0.25, inicio: '2025-12-01', fin: '2025-12-16', duracion: '15 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.2.4', name: 'Provisionales de obra isla 3',
              peso: 0.25, inicio: '2026-04-16', fin: '2026-05-01', duracion: '15 días',
              avanceProg: 0.0, avanceReal: 100.0,
            },
          ],
        },
        {
          code: '10.3', name: 'Subestación de Enlace',
          peso: 0.2, inicio: '2026-02-09', fin: '2026-05-19', duracion: '99 días',
          avanceProg: 37.5, avanceReal: 43.3,
          children: [
            {
              code: '10.3.1', name: 'OBRAS CIVILES',
              peso: 0.5, inicio: '2026-02-09', fin: '2026-05-06', duracion: '86 días',
              avanceProg: 60.0, avanceReal: 69.6,
              children: [
                {
                  code: '10.3.1.1', name: 'Adecuación terreno subestaciones',
                  peso: 0.2, inicio: '2026-02-09', fin: '2026-03-06', duracion: '25 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '10.3.1.2', name: 'Construcción de losa de contrapiso (RENOMBRADA)',
                  peso: 0.4, inicio: '2026-03-26', fin: '2026-03-31', duracion: '5 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '10.3.1.3', name: 'Construcción de la subestación (Sistema EPS) (RENOMBRADA)',
                  peso: 0.4, inicio: '2026-05-04', fin: '2026-05-06', duracion: '2 días',
                  avanceProg: 0.0, avanceReal: 24.0,
                },
              ],
            },
            {
              code: '10.3.2', name: 'OBRAS ELÉCTRICAS',
              peso: 0.5, inicio: '2026-02-26', fin: '2026-05-19', duracion: '82 días',
              avanceProg: 15.0, avanceReal: 17.0,
              children: [
                {
                  code: '10.3.2.1', name: 'Instalación de malla puesta a tierra',
                  peso: 0.15, inicio: '2026-02-26', fin: '2026-02-28', duracion: '2 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                },
                {
                  code: '10.3.2.2', name: 'Adecuación eléctrica',
                  peso: 0.1, inicio: '2026-05-06', fin: '2026-05-07', duracion: '1 día',
                  avanceProg: 0.0, avanceReal: 20.0,
                },
                {
                  code: '10.3.2.3', name: 'Ubicación de celdas',
                  peso: 0.1, inicio: '2026-05-09', fin: '2026-05-11', duracion: '2 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.3.2.4', name: 'Conexión de celdas',
                  peso: 0.15, inicio: '2026-05-14', fin: '2026-05-15', duracion: '1 día',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.3.2.5', name: 'Anclaje de celdas',
                  peso: 0.15, inicio: '2026-05-14', fin: '2026-05-15', duracion: '1 día',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.3.2.6', name: 'Cableado en MT',
                  peso: 0.25, inicio: '2026-05-15', fin: '2026-05-16', duracion: '1 día',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.3.2.7', name: 'Certificación RETIE (SE Enlace)',
                  peso: 0.1, inicio: '2026-05-16', fin: '2026-05-19', duracion: '3 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
          ],
        },
        {
          code: '10.4', name: 'Canalizaciones de red de MT',
          peso: 0.15, inicio: '2025-12-05', fin: '2026-05-17', duracion: '163 días',
          avanceProg: 49.0, avanceReal: 48.4,
          children: [
            {
              code: '10.4.1', name: 'OBRAS CIVILES',
              peso: 0.5, inicio: '2025-12-05', fin: '2026-04-18', duracion: '134 días',
              avanceProg: 86.2, avanceReal: 95.2,
              children: [
                {
                  code: '10.4.1.1', name: 'Canalizaciones zona blanda MT',
                  peso: 0.25, inicio: '2025-12-05', fin: '2025-12-21', duracion: '16 días',
                  avanceProg: 100.0, avanceReal: 100.0,
                  children: [
                    {
                      code: '10.4.1.1.1', name: 'Tramo 1 (caja #1-3) incluye cajas',
                      peso: 0.3, inicio: '2025-12-05', fin: '2025-12-20', duracion: '15 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.4.1.1.2', name: 'Tramo 7 (caja #4-14) excavación cielo abierto - 2 cajas',
                      peso: 0.7, inicio: '2025-12-10', fin: '2025-12-21', duracion: '11 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                  ],
                },
                {
                  code: '10.4.1.2', name: 'Cajas y tuberías entradas a subestaciones',
                  peso: 0.25, inicio: '2026-03-14', fin: '2026-04-13', duracion: '30 días',
                  avanceProg: 66.0, avanceReal: 93.0,
                  children: [
                    {
                      code: '10.4.1.2.1', name: 'Caja y tubería entrada a subestación isla 1',
                      peso: 0.34, inicio: '2026-04-10', fin: '2026-04-13', duracion: '3 días',
                      avanceProg: 0.0, avanceReal: 93.0,
                    },
                    {
                      code: '10.4.1.2.2', name: 'Caja y tubería entrada a subestación isla 2',
                      peso: 0.33, inicio: '2026-03-14', fin: '2026-03-17', duracion: '3 días',
                      avanceProg: 100.0, avanceReal: 93.0,
                    },
                    {
                      code: '10.4.1.2.3', name: 'Caja y tubería entrada a subestación isla 3',
                      peso: 0.33, inicio: '2026-03-14', fin: '2026-03-17', duracion: '3 días',
                      avanceProg: 100.0, avanceReal: 93.0,
                    },
                  ],
                },
                {
                  code: '10.4.1.3', name: 'Canalizaciones perforación horizontal zona dura MT - incluye cajas',
                  peso: 0.25, inicio: '2025-12-05', fin: '2026-04-18', duracion: '134 días',
                  avanceProg: 78.8, avanceReal: 93.0,
                  children: [
                    {
                      code: '10.4.1.3.1', name: 'Tramo 2 (caja #3-4) - 2 cajas',
                      peso: 0.2, inicio: '2025-12-05', fin: '2025-12-12', duracion: '7 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.4.1.3.2', name: 'Tramo 3 (caja #4-7) - 3 cajas',
                      peso: 0.25, inicio: '2026-02-22', fin: '2026-03-09', duracion: '15 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.4.1.3.3', name: 'Tramo 4 (caja #7-9) - 2 cajas',
                      peso: 0.2, inicio: '2026-03-09', fin: '2026-03-19', duracion: '10 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.4.1.3.4', name: 'Tramo 5 (caja #9-11) - 1 cajas',
                      peso: 0.1, inicio: '2026-03-19', fin: '2026-03-29', duracion: '10 días',
                      avanceProg: 100.0, avanceReal: 93.0,
                    },
                    {
                      code: '10.4.1.3.5', name: 'Tramo 6 (caja #10-14) - 3 cajas',
                      peso: 0.25, inicio: '2026-03-29', fin: '2026-04-18', duracion: '20 días',
                      avanceProg: 15.0, avanceReal: 75.0,
                    },
                  ],
                },
                {
                  code: '10.4.1.4', name: 'Canalizaciones corrientes débiles y BT',
                  peso: 0.25, inicio: '2026-02-19', fin: '2026-03-11', duracion: '20 días',
                  avanceProg: 100.0, avanceReal: 94.9,
                  children: [
                    {
                      code: '10.4.1.4.1', name: 'Tramo 1 (Caja #1-2) 30m - 2 cajas',
                      peso: 0.4, inicio: '2026-02-19', fin: '2026-03-11', duracion: '20 días',
                      avanceProg: 100.0, avanceReal: 95.0,
                    },
                    {
                      code: '10.4.1.4.2', name: 'Tramo 2 (Caja #2-3) 30m - 1 caja',
                      peso: 0.15, inicio: '2026-03-05', fin: '2026-03-11', duracion: '6 días',
                      avanceProg: 100.0, avanceReal: 93.0,
                    },
                    {
                      code: '10.4.1.4.3', name: 'Tramo 3 (Caja #3-4) 30m -1 caja',
                      peso: 0.15, inicio: '2026-03-07', fin: '2026-03-11', duracion: '4 días',
                      avanceProg: 100.0, avanceReal: 93.0,
                    },
                    {
                      code: '10.4.1.4.4', name: 'Tramo 4 (Caja #4-5) 30m -1 caja',
                      peso: 0.15, inicio: '2026-03-07', fin: '2026-03-11', duracion: '4 días',
                      avanceProg: 100.0, avanceReal: 93.0,
                    },
                    {
                      code: '10.4.1.4.5', name: 'Tramo 5 (Caja #5-6) 30m -1 caja',
                      peso: 0.15, inicio: '2026-03-07', fin: '2026-03-11', duracion: '4 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                  ],
                },
              ],
            },
            {
              code: '10.4.2', name: 'OBRAS ELÉCTRICAS',
              peso: 0.5, inicio: '2026-02-12', fin: '2026-05-17', duracion: '94 días',
              avanceProg: 11.8, avanceReal: 1.5,
              children: [
                {
                  code: '10.4.2.1', name: 'Cableado de MT',
                  peso: 0.7, inicio: '2026-05-06', fin: '2026-05-17', duracion: '11 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.4.2.1.1', name: 'Cableado de MT tramo zona blanda + tramo 1 y 2',
                      peso: 0.3, inicio: '2026-05-06', fin: '2026-05-11', duracion: '5 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                    {
                      code: '10.4.2.1.2', name: 'Cableado de MT tramo 5',
                      peso: 0.2, inicio: '2026-05-06', fin: '2026-05-09', duracion: '3 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                    {
                      code: '10.4.2.1.3', name: 'Cableado de MT tramo 6',
                      peso: 0.2, inicio: '2026-05-09', fin: '2026-05-10', duracion: '1 día',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                    {
                      code: '10.4.2.1.4', name: 'Cableado de MT tramo 3 y 4',
                      peso: 0.3, inicio: '2026-05-10', fin: '2026-05-17', duracion: '7 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                  ],
                },
                {
                  code: '10.4.2.2', name: 'Red de conexión aérea (HECHA MADRE)',
                  peso: 0.3, inicio: '2026-02-12', fin: '2026-04-21', duracion: '68 días',
                  avanceProg: 39.4, avanceReal: 5.0,
                  children: [
                    {
                      code: '10.4.2.2.1', name: 'Visita y levantamiento para boletín pago (NUEVA)',
                      peso: 0.05, inicio: '2026-02-12', fin: '2026-02-12', duracion: '0 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.4.2.2.2', name: 'Entrega de oferta de oportunidad (NUEVA)',
                      peso: 0.2, inicio: '2026-02-12', fin: '2026-03-19', duracion: '35 días',
                      avanceProg: 100.0, avanceReal: 0.0,
                    },
                    {
                      code: '10.4.2.2.3', name: 'Legalización de oferta de oportunidad (NUEVA)',
                      peso: 0.2, inicio: '2026-03-19', fin: '2026-04-06', duracion: '18 días',
                      avanceProg: 72.2, avanceReal: 0.0,
                    },
                    {
                      code: '10.4.2.2.4', name: 'Construcción de la red aérea (NUEVA)',
                      peso: 0.55, inicio: '2026-04-06', fin: '2026-04-21', duracion: '15 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          code: '10.5', name: 'Isla 1',
          peso: 0.18, inicio: '2026-02-09', fin: '2026-06-16', duracion: '127 días',
          avanceProg: 25.8, avanceReal: 21.7,
          children: [
            {
              code: '10.5.1', name: 'OBRAS CIVILES',
              peso: 0.4, inicio: '2026-02-09', fin: '2026-05-04', duracion: '84 días',
              avanceProg: 60.5, avanceReal: 45.7,
              children: [
                {
                  code: '10.5.1.1', name: 'Envolventes',
                  peso: 0.4, inicio: '2026-02-09', fin: '2026-05-04', duracion: '84 días',
                  avanceProg: 80.0, avanceReal: 59.6,
                  children: [
                    {
                      code: '10.5.1.1.1', name: 'Adecuación terreno subestación',
                      peso: 0.4, inicio: '2026-02-09', fin: '2026-02-26', duracion: '17 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.5.1.1.2', name: 'Construcción de losa de contrapiso (RENOMBRADA)',
                      peso: 0.4, inicio: '2026-03-26', fin: '2026-04-01', duracion: '6 días',
                      avanceProg: 100.0, avanceReal: 49.0,
                    },
                    {
                      code: '10.5.1.1.3', name: 'Construcción de la envolvente (Sistema EPS) (RENOMBRADA)',
                      peso: 0.2, inicio: '2026-04-02', fin: '2026-05-04', duracion: '32 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                  ],
                },
                {
                  code: '10.5.1.2', name: 'Estructura',
                  peso: 0.6, inicio: '2026-03-02', fin: '2026-05-04', duracion: '63 días',
                  avanceProg: 47.5, avanceReal: 36.5,
                  children: [
                    {
                      code: '10.5.1.2.1', name: 'Zona Izquierda',
                      peso: 0.5, inicio: '2026-03-02', fin: '2026-04-20', duracion: '49 días',
                      avanceProg: 50.0, avanceReal: 40.5,
                      children: [
                        {
                          code: '10.5.1.2.1.1', name: 'Base Estructura Metalica Isla 1 Zapatas (RENOMBRADA)',
                          peso: 0.5, inicio: '2026-03-02', fin: '2026-03-22', duracion: '20 días',
                          avanceProg: 100.0, avanceReal: 81.0,
                        },
                        {
                          code: '10.5.1.2.1.2', name: 'Instalación Estructura metálica isla 1',
                          peso: 0.5, inicio: '2026-04-08', fin: '2026-04-20', duracion: '12 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.5.1.2.2', name: 'Zona Derecha',
                      peso: 0.5, inicio: '2026-03-14', fin: '2026-05-04', duracion: '51 días',
                      avanceProg: 45.0, avanceReal: 32.5,
                      children: [
                        {
                          code: '10.5.1.2.2.1', name: 'Base Estructura Metalica Isla 1 Zapatas (RENOMBRADA)',
                          peso: 0.5, inicio: '2026-03-14', fin: '2026-04-03', duracion: '20 días',
                          avanceProg: 90.0, avanceReal: 65.0,
                        },
                        {
                          code: '10.5.1.2.2.2', name: 'Instalación Estructura metálica isla 1',
                          peso: 0.5, inicio: '2026-04-22', fin: '2026-05-04', duracion: '12 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              code: '10.5.2', name: 'OBRAS ELÉCTRICAS',
              peso: 0.4, inicio: '2026-02-12', fin: '2026-06-11', duracion: '119 días',
              avanceProg: 4.0, avanceReal: 8.4,
              children: [
                {
                  code: '10.5.2.1', name: 'Subestación',
                  peso: 0.4, inicio: '2026-02-12', fin: '2026-06-03', duracion: '111 días',
                  avanceProg: 10.0, avanceReal: 10.0,
                  children: [
                    {
                      code: '10.5.2.1.1', name: 'Instalación de malla puesta a tierra',
                      peso: 0.1, inicio: '2026-02-12', fin: '2026-02-27', duracion: '15 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.5.2.1.2', name: 'Shelter MT (1)',
                      peso: 0.3, inicio: '2026-05-06', fin: '2026-06-03', duracion: '28 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.2.1.2.1', name: 'Adecuación eléctrica de shelters',
                          peso: 0.15, inicio: '2026-05-06', fin: '2026-05-07', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.2.2', name: 'Ubicación de celdas',
                          peso: 0.15, inicio: '2026-05-07', fin: '2026-05-10', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.2.3', name: 'Conexión de celdas',
                          peso: 0.15, inicio: '2026-05-10', fin: '2026-05-11', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.2.4', name: 'Anclaje de celdas',
                          peso: 0.15, inicio: '2026-05-11', fin: '2026-05-12', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.2.5', name: 'Instalación del transformador',
                          peso: 0.2, inicio: '2026-05-12', fin: '2026-05-13', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.2.6', name: 'Cableado MT',
                          peso: 0.15, inicio: '2026-05-12', fin: '2026-05-13', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.2.7', name: 'Interconexión Trafo + TGA\'s',
                          peso: 0.05, inicio: '2026-05-29', fin: '2026-06-03', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.5.2.1.3', name: 'Shelter BT (2) - Zona Izquierda',
                      peso: 0.3, inicio: '2026-05-06', fin: '2026-06-01', duracion: '26 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.2.1.3.1', name: 'Adecuación eléctrica de shelters',
                          peso: 0.2, inicio: '2026-05-06', fin: '2026-05-07', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.3.2', name: 'Ubicación de celdas',
                          peso: 0.2, inicio: '2026-05-07', fin: '2026-05-09', duracion: '2 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.3.3', name: 'Conexión de celdas',
                          peso: 0.2, inicio: '2026-05-09', fin: '2026-05-10', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.3.4', name: 'Anclaje de celdas',
                          peso: 0.2, inicio: '2026-05-10', fin: '2026-05-11', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.3.5', name: 'Interconexión TGA\'s + Cargadores',
                          peso: 0.2, inicio: '2026-05-11', fin: '2026-06-01', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.5.2.1.4', name: 'Shelter BT (3) - Zona Derecha',
                      peso: 0.3, inicio: '2026-05-06', fin: '2026-06-01', duracion: '26 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.2.1.4.1', name: 'Adecuación eléctrica de shelters',
                          peso: 0.2, inicio: '2026-05-06', fin: '2026-05-07', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.4.2', name: 'Ubicación de celdas',
                          peso: 0.2, inicio: '2026-05-07', fin: '2026-05-09', duracion: '2 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.4.3', name: 'Conexión de celdas',
                          peso: 0.2, inicio: '2026-05-09', fin: '2026-05-10', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.4.4', name: 'Anclaje de celdas',
                          peso: 0.2, inicio: '2026-05-10', fin: '2026-05-11', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.1.4.5', name: 'Interconexión TGA\'s + Cargadores',
                          peso: 0.2, inicio: '2026-05-11', fin: '2026-06-01', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.5.2.2', name: 'Cargadores',
                  peso: 0.3, inicio: '2026-04-01', fin: '2026-06-11', duracion: '71 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.5.2.2.1', name: 'Zona Izquierda',
                      peso: 0.5, inicio: '2026-04-01', fin: '2026-06-11', duracion: '71 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.2.2.1.1', name: 'Instalación de cargadores',
                          peso: 0.25, inicio: '2026-04-01', fin: '2026-04-05', duracion: '4 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.2.1.2', name: 'Instalación de bandejas',
                          peso: 0.25, inicio: '2026-04-20', fin: '2026-04-28', duracion: '8 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.2.1.3', name: 'Instalación de dispensadores',
                          peso: 0.25, inicio: '2026-04-20', fin: '2026-04-24', duracion: '4 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.2.1.4', name: 'Cableado de DC',
                          peso: 0.25, inicio: '2026-06-01', fin: '2026-06-11', duracion: '10 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.5.2.2.2', name: 'Zona derecha',
                      peso: 0.5, inicio: '2026-04-01', fin: '2026-06-11', duracion: '71 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.2.2.2.1', name: 'Instalación de cargadores',
                          peso: 0.25, inicio: '2026-04-01', fin: '2026-04-05', duracion: '4 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.2.2.2', name: 'Instalación de bandejas',
                          peso: 0.25, inicio: '2026-05-04', fin: '2026-05-12', duracion: '8 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.2.2.3', name: 'Instalación de dispensadores',
                          peso: 0.25, inicio: '2026-05-04', fin: '2026-05-08', duracion: '4 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.2.2.4', name: 'Cableado de DC',
                          peso: 0.25, inicio: '2026-06-01', fin: '2026-06-11', duracion: '10 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.5.2.3', name: 'Servicios auxiliares',
                  peso: 0.2, inicio: '2026-05-07', fin: '2026-05-29', duracion: '22 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.5.2.3.1', name: 'Zona Izquierda',
                      peso: 0.5, inicio: '2026-05-07', fin: '2026-05-29', duracion: '22 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.2.3.1.1', name: 'Instalación tablero de iluminación y tomas (TMB1, Envolvente 2) (RENOMBRADA)',
                          peso: 0.5, inicio: '2026-05-07', fin: '2026-05-08', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.3.1.2', name: 'Instalación de iluminación cercha superior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.3.1.3', name: 'Instalación de iluminación cercha inferior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.5.2.3.2', name: 'Zona Derecha',
                      peso: 0.5, inicio: '2026-05-07', fin: '2026-05-29', duracion: '22 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.2.3.2.1', name: 'Instalación tablero de iluminación y tomas (TMB1, Envolvente 3) (RENOMBRADA)',
                          peso: 0.5, inicio: '2026-05-07', fin: '2026-05-08', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.3.2.2', name: 'Instalación de iluminación cercha superior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.2.3.2.3', name: 'Instalación de iluminación cercha inferior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.5.2.4', name: 'Apantallamiento (REUBICADA)',
                  peso: 0.1, inicio: '2026-05-04', fin: '2026-05-09', duracion: '5 días',
                  avanceProg: 0.0, avanceReal: 44.0,
                },
              ],
            },
            {
              code: '10.5.3', name: 'COMUNICACIONES',
              peso: 0.05, inicio: '2026-05-07', fin: '2026-06-16', duracion: '40 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.5.3.1', name: 'Zona Izquierda',
                  peso: 0.5, inicio: '2026-05-07', fin: '2026-06-16', duracion: '40 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.5.3.1.1', name: 'Corrientes débiles',
                      peso: 0.5, inicio: '2026-05-07', fin: '2026-05-09', duracion: '2 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.3.1.1.1', name: 'Instalación y conexiones de equipos en racks de comunicaciones',
                          peso: 0.6, inicio: '2026-05-07', fin: '2026-05-08', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.3.1.1.2', name: 'Pruebas',
                          peso: 0.4, inicio: '2026-05-08', fin: '2026-05-09', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.5.3.1.2', name: 'Pruebas de cargadores y dispensadores',
                      peso: 0.5, inicio: '2026-06-11', fin: '2026-06-16', duracion: '5 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.3.1.2.1', name: 'Programación de cargadores',
                          peso: 0.6, inicio: '2026-06-11', fin: '2026-06-13', duracion: '2 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.3.1.2.2', name: 'Pruebas de cargadores y equipos',
                          peso: 0.4, inicio: '2026-06-13', fin: '2026-06-16', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.5.3.2', name: 'Zona Derecha',
                  peso: 0.5, inicio: '2026-05-07', fin: '2026-06-16', duracion: '40 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.5.3.2.1', name: 'Corrientes débiles',
                      peso: 0.5, inicio: '2026-05-07', fin: '2026-05-09', duracion: '2 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.3.2.1.1', name: 'Instalación y conexiones de equipos en racks de comunicaciones',
                          peso: 0.6, inicio: '2026-05-07', fin: '2026-05-08', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.3.2.1.2', name: 'Pruebas',
                          peso: 0.4, inicio: '2026-05-08', fin: '2026-05-09', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.5.3.2.2', name: 'Pruebas de cargadores y dispensadores',
                      peso: 0.5, inicio: '2026-06-11', fin: '2026-06-16', duracion: '5 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.5.3.2.2.1', name: 'Programación de cargadores',
                          peso: 0.6, inicio: '2026-06-11', fin: '2026-06-13', duracion: '2 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.5.3.2.2.2', name: 'Pruebas de cargadores y equipos',
                          peso: 0.4, inicio: '2026-06-13', fin: '2026-06-16', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              code: '10.5.4', name: 'REDES DETECCIÓN / EXTINCIÓN',
              peso: 0.05, inicio: '2026-04-08', fin: '2026-05-02', duracion: '24 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.5.4.1', name: 'Zona Izquierda',
                  peso: 0.5, inicio: '2026-04-08', fin: '2026-04-18', duracion: '10 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.5.4.1.1', name: 'Detección',
                      peso: 0.4, inicio: '2026-04-08', fin: '2026-04-18', duracion: '10 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                    {
                      code: '10.5.4.1.2', name: 'Extinción',
                      peso: 0.6, inicio: '2026-04-08', fin: '2026-04-18', duracion: '10 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                  ],
                },
                {
                  code: '10.5.4.2', name: 'Zona Derecha',
                  peso: 0.5, inicio: '2026-04-22', fin: '2026-05-02', duracion: '10 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.5.4.2.1', name: 'Detección',
                      peso: 0.4, inicio: '2026-04-22', fin: '2026-05-02', duracion: '10 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                    {
                      code: '10.5.4.2.2', name: 'Extinción',
                      peso: 0.6, inicio: '2026-04-22', fin: '2026-05-02', duracion: '10 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                  ],
                },
              ],
            },
            {
              code: '10.5.5', name: 'Certificación RETIE (Isla 1)',
              peso: 0.05, inicio: '2026-04-18', fin: '2026-04-18', duracion: '0 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.5.6', name: 'Entrega de isla 1 a operaciones',
              peso: 0.05, inicio: '2026-06-16', fin: '2026-06-16', duracion: '0 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '10.6', name: 'Isla 2',
          peso: 0.18, inicio: '2026-02-04', fin: '2026-06-30', duracion: '146 días',
          avanceProg: 17.4, avanceReal: 10.6,
          children: [
            {
              code: '10.6.1', name: 'OBRAS CIVILES',
              peso: 0.4, inicio: '2026-02-04', fin: '2026-05-04', duracion: '89 días',
              avanceProg: 39.5, avanceReal: 22.4,
              children: [
                {
                  code: '10.6.1.1', name: 'Envolventes',
                  peso: 0.4, inicio: '2026-02-04', fin: '2026-05-04', duracion: '89 días',
                  avanceProg: 64.0, avanceReal: 56.0,
                  children: [
                    {
                      code: '10.6.1.1.1', name: 'Adecuación terreno subestación',
                      peso: 0.4, inicio: '2026-02-04', fin: '2026-02-12', duracion: '8 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.6.1.1.2', name: 'Construcción de losa de contrapiso (RENOMBRADA)',
                      peso: 0.4, inicio: '2026-03-26', fin: '2026-04-05', duracion: '10 días',
                      avanceProg: 60.0, avanceReal: 40.0,
                    },
                    {
                      code: '10.6.1.1.3', name: 'Construcción de la envolvente (Sistema EPS) (RENOMBRADA)',
                      peso: 0.2, inicio: '2026-04-01', fin: '2026-05-04', duracion: '33 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                  ],
                },
                {
                  code: '10.6.1.2', name: 'Estructura',
                  peso: 0.6, inicio: '2026-03-19', fin: '2026-05-02', duracion: '44 días',
                  avanceProg: 23.2, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.6.1.2.1', name: 'Zona izquierda',
                      peso: 0.5, inicio: '2026-03-19', fin: '2026-05-02', duracion: '44 días',
                      avanceProg: 23.2, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.1.2.1.1', name: 'Base Estructura Metalica Isla 2 Zapatas (RENOMBRADA)',
                          peso: 0.5, inicio: '2026-03-19', fin: '2026-04-16', duracion: '28 días',
                          avanceProg: 46.4, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.1.2.1.2', name: 'Instalación Estructura metálica isla 2',
                          peso: 0.5, inicio: '2026-04-26', fin: '2026-05-02', duracion: '6 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.6.1.2.2', name: 'Zona Derecha',
                      peso: 0.5, inicio: '2026-03-19', fin: '2026-05-02', duracion: '44 días',
                      avanceProg: 23.2, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.1.2.2.1', name: 'Base Estructura Metalica Isla 2 Zapatas (RENOMBRADA)',
                          peso: 0.5, inicio: '2026-03-19', fin: '2026-04-16', duracion: '28 días',
                          avanceProg: 46.4, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.1.2.2.2', name: 'Instalación Estructura metálica isla 2',
                          peso: 0.5, inicio: '2026-04-26', fin: '2026-05-02', duracion: '6 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              code: '10.6.2', name: 'OBRAS ELÉCTRICAS',
              peso: 0.4, inicio: '2026-03-05', fin: '2026-06-20', duracion: '107 días',
              avanceProg: 4.0, avanceReal: 4.0,
              children: [
                {
                  code: '10.6.2.1', name: 'Subestación',
                  peso: 0.4, inicio: '2026-03-05', fin: '2026-06-01', duracion: '88 días',
                  avanceProg: 10.0, avanceReal: 10.0,
                  children: [
                    {
                      code: '10.6.2.1.1', name: 'Instalación de malla puesta a tierra',
                      peso: 0.1, inicio: '2026-03-05', fin: '2026-03-07', duracion: '2 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.6.2.1.2', name: 'Envolvente MT (4) (RENOMBRADA)',
                      peso: 0.3, inicio: '2026-05-04', fin: '2026-06-01', duracion: '28 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.2.1.2.1', name: 'Adecuación eléctrica de envolventes (RENOMBRADA)',
                          peso: 0.15, inicio: '2026-05-04', fin: '2026-05-05', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.2.2', name: 'Ubicación de celdas',
                          peso: 0.15, inicio: '2026-05-05', fin: '2026-05-08', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.2.3', name: 'Conexión de celdas',
                          peso: 0.15, inicio: '2026-05-08', fin: '2026-05-09', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.2.4', name: 'Anclaje de celdas',
                          peso: 0.15, inicio: '2026-05-09', fin: '2026-05-10', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.2.5', name: 'Instalación del transformador',
                          peso: 0.2, inicio: '2026-05-10', fin: '2026-05-11', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.2.6', name: 'Cableado MT',
                          peso: 0.15, inicio: '2026-05-10', fin: '2026-05-11', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.2.7', name: 'Interconexión Trafo + TGA\'s',
                          peso: 0.05, inicio: '2026-05-11', fin: '2026-06-01', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.6.2.1.3', name: 'Envolvente BT (5) (RENOMBRADA)',
                      peso: 0.3, inicio: '2026-05-04', fin: '2026-05-30', duracion: '26 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.2.1.3.1', name: 'Adecuación eléctrica de envolventes (RENOMBRADA)',
                          peso: 0.2, inicio: '2026-05-04', fin: '2026-05-05', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.3.2', name: 'Ubicación de celdas',
                          peso: 0.2, inicio: '2026-05-05', fin: '2026-05-07', duracion: '2 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.3.3', name: 'Conexión de celdas',
                          peso: 0.2, inicio: '2026-05-07', fin: '2026-05-08', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.3.4', name: 'Anclaje de celdas',
                          peso: 0.2, inicio: '2026-05-08', fin: '2026-05-09', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.3.5', name: 'Interconexión TGA\'s + Cargadores',
                          peso: 0.2, inicio: '2026-05-09', fin: '2026-05-30', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.6.2.1.4', name: 'Envolvente BT (6) (RENOMBRADA)',
                      peso: 0.3, inicio: '2026-05-04', fin: '2026-05-30', duracion: '26 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.2.1.4.1', name: 'Adecuación eléctrica de envolventes (RENOMBRADA)',
                          peso: 0.2, inicio: '2026-05-04', fin: '2026-05-05', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.4.2', name: 'Ubicación de celdas',
                          peso: 0.2, inicio: '2026-05-05', fin: '2026-05-07', duracion: '2 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.4.3', name: 'Conexión de celdas',
                          peso: 0.2, inicio: '2026-05-07', fin: '2026-05-08', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.4.4', name: 'Anclaje de celdas',
                          peso: 0.2, inicio: '2026-05-08', fin: '2026-05-09', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.1.4.5', name: 'Interconexión TGA\'s + Cargadores',
                          peso: 0.2, inicio: '2026-05-09', fin: '2026-05-30', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.6.2.2', name: 'Cargadores',
                  peso: 0.3, inicio: '2026-04-05', fin: '2026-06-20', duracion: '76 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.6.2.2.1', name: 'Zona izquierda',
                      peso: 0.5, inicio: '2026-04-05', fin: '2026-06-20', duracion: '76 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.2.2.1.1', name: 'Instalación de cargadores',
                          peso: 0.25, inicio: '2026-04-05', fin: '2026-04-12', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.2.1.2', name: 'Instalación de bandejas',
                          peso: 0.25, inicio: '2026-05-02', fin: '2026-05-17', duracion: '15 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.2.1.3', name: 'Instalación de dispensadores',
                          peso: 0.25, inicio: '2026-05-02', fin: '2026-05-09', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.2.1.4', name: 'Cableado de DC',
                          peso: 0.25, inicio: '2026-05-30', fin: '2026-06-20', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.6.2.2.2', name: 'Zona Derecha',
                      peso: 0.5, inicio: '2026-04-05', fin: '2026-06-20', duracion: '76 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.2.2.2.1', name: 'Instalación de cargadores',
                          peso: 0.25, inicio: '2026-04-05', fin: '2026-04-12', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.2.2.2', name: 'Instalación de bandejas',
                          peso: 0.25, inicio: '2026-05-02', fin: '2026-05-17', duracion: '15 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.2.2.3', name: 'Instalación de dispensadores',
                          peso: 0.25, inicio: '2026-05-02', fin: '2026-05-09', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.2.2.4', name: 'Cableado de DC',
                          peso: 0.25, inicio: '2026-05-30', fin: '2026-06-20', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.6.2.3', name: 'Servicios auxiliares',
                  peso: 0.2, inicio: '2026-05-05', fin: '2026-05-29', duracion: '24 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.6.2.3.1', name: 'Zona Izquierda',
                      peso: 0.5, inicio: '2026-05-05', fin: '2026-05-29', duracion: '24 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.2.3.1.1', name: 'Instalación tablero de iluminación y tomas (TMB3, Envolvente 5)',
                          peso: 0.5, inicio: '2026-05-05', fin: '2026-05-06', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.3.1.2', name: 'Instalación de iluminación cercha superior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.3.1.3', name: 'Instalación de iluminación cercha inferior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.6.2.3.2', name: 'Zona Derecha',
                      peso: 0.5, inicio: '2026-05-05', fin: '2026-05-29', duracion: '24 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.2.3.2.1', name: 'Instalación tablero de iluminación y tomas (TMB4, Envolvente 6)',
                          peso: 0.5, inicio: '2026-05-05', fin: '2026-05-06', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.3.2.2', name: 'Instalación de iluminación cercha superior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.2.3.2.3', name: 'Instalación de iluminación cercha inferior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.6.2.4', name: 'Apantallamiento (REUBICADA)',
                  peso: 0.1, inicio: '2026-05-02', fin: '2026-05-12', duracion: '10 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '10.6.3', name: 'COMUNICACIONES',
              peso: 0.05, inicio: '2026-05-17', fin: '2026-06-30', duracion: '44 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.6.3.1', name: 'Zona Izquierda',
                  peso: 0.5, inicio: '2026-05-17', fin: '2026-06-30', duracion: '44 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.6.3.1.1', name: 'Corrientes débiles',
                      peso: 0.5, inicio: '2026-05-17', fin: '2026-05-19', duracion: '2 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.3.1.1.1', name: 'Instalación y conexiones de equipos en racks de comunicaciones',
                          peso: 0.6, inicio: '2026-05-17', fin: '2026-05-18', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.3.1.1.2', name: 'Pruebas',
                          peso: 0.4, inicio: '2026-05-18', fin: '2026-05-19', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.6.3.1.2', name: 'Pruebas de cargadores y dispensadores',
                      peso: 0.5, inicio: '2026-06-20', fin: '2026-06-30', duracion: '10 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.3.1.2.1', name: 'Programación de cargadores',
                          peso: 0.6, inicio: '2026-06-20', fin: '2026-06-23', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.3.1.2.2', name: 'Pruebas de cargadores y equipos',
                          peso: 0.4, inicio: '2026-06-23', fin: '2026-06-30', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.6.3.2', name: 'Zona Derecha',
                  peso: 0.5, inicio: '2026-05-18', fin: '2026-06-30', duracion: '43 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.6.3.2.1', name: 'Corrientes débiles',
                      peso: 0.5, inicio: '2026-05-18', fin: '2026-05-20', duracion: '2 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.3.2.1.1', name: 'Instalación y conexiones de equipos en racks de comunicaciones',
                          peso: 0.6, inicio: '2026-05-18', fin: '2026-05-19', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.3.2.1.2', name: 'Pruebas',
                          peso: 0.4, inicio: '2026-05-19', fin: '2026-05-20', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.6.3.2.2', name: 'Pruebas de cargadores y dispensadores',
                      peso: 0.5, inicio: '2026-06-20', fin: '2026-06-30', duracion: '10 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.6.3.2.2.1', name: 'Programación de cargadores',
                          peso: 0.6, inicio: '2026-06-20', fin: '2026-06-23', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.6.3.2.2.2', name: 'Pruebas de cargadores y equipos',
                          peso: 0.4, inicio: '2026-06-23', fin: '2026-06-30', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              code: '10.6.4', name: 'REDES DETECCIÓN / EXTINCIÓN',
              peso: 0.05, inicio: '2026-04-26', fin: '2026-05-16', duracion: '20 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.6.4.1', name: 'Detección',
                  peso: 0.4, inicio: '2026-04-26', fin: '2026-05-16', duracion: '20 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.6.4.2', name: 'Extinción',
                  peso: 0.6, inicio: '2026-04-26', fin: '2026-05-16', duracion: '20 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '10.6.5', name: 'Certificación RETIE (isla 2)',
              peso: 0.05, inicio: '2026-06-25', fin: '2026-06-30', duracion: '5 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.6.6', name: 'Entrega de isla 2 a operaciones',
              peso: 0.05, inicio: '2026-06-30', fin: '2026-06-30', duracion: '0 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '10.7', name: 'Isla 3',
          peso: 0.18, inicio: '2026-02-27', fin: '2026-06-29', duracion: '122 días',
          avanceProg: 11.8, avanceReal: 10.6,
          children: [
            {
              code: '10.7.1', name: 'OBRAS CIVILES',
              peso: 0.4, inicio: '2026-02-27', fin: '2026-05-14', duracion: '76 días',
              avanceProg: 25.6, avanceReal: 22.4,
              children: [
                {
                  code: '10.7.1.1', name: 'Envolventes',
                  peso: 0.4, inicio: '2026-02-27', fin: '2026-04-28', duracion: '60 días',
                  avanceProg: 64.0, avanceReal: 56.0,
                  children: [
                    {
                      code: '10.7.1.1.1', name: 'Adecuación terreno subestación',
                      peso: 0.4, inicio: '2026-02-27', fin: '2026-03-05', duracion: '6 días',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.7.1.1.2', name: 'Construcción de losa de contrapiso (RENOMBRADA)',
                      peso: 0.4, inicio: '2026-03-26', fin: '2026-04-05', duracion: '10 días',
                      avanceProg: 60.0, avanceReal: 40.0,
                    },
                    {
                      code: '10.7.1.1.3', name: 'Construcción de la envolvente (Sistema EPS) (RENOMBRADA)',
                      peso: 0.2, inicio: '2026-04-06', fin: '2026-04-28', duracion: '22 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                    },
                  ],
                },
                {
                  code: '10.7.1.2', name: 'Estructura',
                  peso: 0.6, inicio: '2026-04-16', fin: '2026-05-14', duracion: '28 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.7.1.2.1', name: 'Zona izquierda',
                      peso: 0.5, inicio: '2026-04-16', fin: '2026-05-14', duracion: '28 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.1.2.1.1', name: 'Base Estructura Metalica Isla 3 Zapatas (RENOMBRADA)',
                          peso: 0.5, inicio: '2026-04-16', fin: '2026-05-14', duracion: '28 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.1.2.1.2', name: 'Instalación Estructura metálica isla 3',
                          peso: 0.5, inicio: '2026-04-29', fin: '2026-05-05', duracion: '6 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.7.1.2.2', name: 'Zona derecha',
                      peso: 0.5, inicio: '2026-04-16', fin: '2026-05-14', duracion: '28 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.1.2.2.1', name: 'Base Estructura Metalica Isla 3 Zapatas (RENOMBRADA)',
                          peso: 0.5, inicio: '2026-04-16', fin: '2026-05-14', duracion: '28 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.1.2.2.2', name: 'Instalación Estructura metálica isla 3',
                          peso: 0.5, inicio: '2026-04-29', fin: '2026-05-05', duracion: '6 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              code: '10.7.2', name: 'OBRAS ELÉCTRICAS',
              peso: 0.4, inicio: '2026-03-11', fin: '2026-06-19', duracion: '100 días',
              avanceProg: 4.0, avanceReal: 4.0,
              children: [
                {
                  code: '10.7.2.1', name: 'Subestación',
                  peso: 0.4, inicio: '2026-03-11', fin: '2026-05-29', duracion: '79 días',
                  avanceProg: 10.0, avanceReal: 10.0,
                  children: [
                    {
                      code: '10.7.2.1.1', name: 'Instalación de malla puesta a tierra',
                      peso: 0.1, inicio: '2026-03-11', fin: '2026-03-12', duracion: '1 día',
                      avanceProg: 100.0, avanceReal: 100.0,
                    },
                    {
                      code: '10.7.2.1.2', name: 'Envolvente MT (7) (RENOMBRADA)',
                      peso: 0.5, inicio: '2026-04-28', fin: '2026-05-29', duracion: '31 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.2.1.2.1', name: 'Adecuación eléctrica de envolventes (RENOMBRADA)',
                          peso: 0.15, inicio: '2026-04-28', fin: '2026-04-29', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.2.2', name: 'Ubicación de celdas',
                          peso: 0.15, inicio: '2026-04-29', fin: '2026-05-02', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.2.3', name: 'Conexión de celdas',
                          peso: 0.15, inicio: '2026-05-02', fin: '2026-05-03', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.2.4', name: 'Anclaje de celdas',
                          peso: 0.15, inicio: '2026-05-03', fin: '2026-05-04', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.2.5', name: 'Instalación del transformador',
                          peso: 0.2, inicio: '2026-05-07', fin: '2026-05-08', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.2.6', name: 'Cableado MT',
                          peso: 0.15, inicio: '2026-05-07', fin: '2026-05-08', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.2.7', name: 'Interconexión Trafo + TGA\'s',
                          peso: 0.05, inicio: '2026-05-08', fin: '2026-05-29', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.7.2.1.3', name: 'Envolvente BT (8) (RENOMBRADA)',
                      peso: 0.4, inicio: '2026-04-28', fin: '2026-05-22', duracion: '24 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.2.1.3.1', name: 'Adecuación eléctrica de envolventes (RENOMBRADA)',
                          peso: 0.2, inicio: '2026-04-28', fin: '2026-04-29', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.3.2', name: 'Ubicación de celdas',
                          peso: 0.2, inicio: '2026-04-29', fin: '2026-05-01', duracion: '2 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.3.3', name: 'Conexión de celdas',
                          peso: 0.2, inicio: '2026-04-29', fin: '2026-04-30', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.3.4', name: 'Anclaje de celdas',
                          peso: 0.2, inicio: '2026-04-30', fin: '2026-05-01', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.1.3.5', name: 'Interconexión TGA\'s + Cargadores',
                          peso: 0.2, inicio: '2026-05-01', fin: '2026-05-22', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.7.2.2', name: 'Cargadores',
                  peso: 0.3, inicio: '2026-04-05', fin: '2026-06-19', duracion: '75 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.7.2.2.1', name: 'Zona izquierda',
                      peso: 0.5, inicio: '2026-04-05', fin: '2026-06-19', duracion: '75 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.2.2.1.1', name: 'Instalación de cargadores',
                          peso: 0.25, inicio: '2026-04-05', fin: '2026-04-12', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.2.1.2', name: 'Instalación de bandejas',
                          peso: 0.25, inicio: '2026-05-05', fin: '2026-05-20', duracion: '15 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.2.1.3', name: 'Instalación de dispensadores',
                          peso: 0.25, inicio: '2026-05-05', fin: '2026-05-12', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.2.1.4', name: 'Cableado de DC',
                          peso: 0.25, inicio: '2026-05-29', fin: '2026-06-19', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.7.2.2.2', name: 'Zona derecha',
                      peso: 0.5, inicio: '2026-04-05', fin: '2026-06-12', duracion: '68 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.2.2.2.1', name: 'Instalación de cargadores',
                          peso: 0.25, inicio: '2026-04-05', fin: '2026-04-12', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.2.2.2', name: 'Instalación de bandejas',
                          peso: 0.25, inicio: '2026-05-05', fin: '2026-05-20', duracion: '15 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.2.2.3', name: 'Instalación de dispensadores',
                          peso: 0.25, inicio: '2026-05-05', fin: '2026-05-12', duracion: '7 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.2.2.4', name: 'Cableado de DC',
                          peso: 0.25, inicio: '2026-05-22', fin: '2026-06-12', duracion: '21 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.7.2.3', name: 'Servicios auxiliares',
                  peso: 0.2, inicio: '2026-04-29', fin: '2026-05-29', duracion: '30 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.7.2.3.1', name: 'Zona izquierda',
                      peso: 0.5, inicio: '2026-04-29', fin: '2026-05-29', duracion: '30 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.2.3.1.1', name: 'Instalación tablero de iluminación y tomas (TMB5, Envolvente 8)',
                          peso: 0.5, inicio: '2026-04-29', fin: '2026-04-30', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.3.1.2', name: 'Instalación de iluminación cercha superior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.3.1.3', name: 'Instalación de iluminación cercha inferior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.7.2.3.2', name: 'Zona derecha',
                      peso: 0.5, inicio: '2026-04-29', fin: '2026-05-29', duracion: '30 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.2.3.2.1', name: 'Instalación tablero de iluminación y tomas (TMB5, Envolvente 8)',
                          peso: 0.5, inicio: '2026-04-29', fin: '2026-04-30', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.3.2.2', name: 'Instalación de iluminación cercha superior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.2.3.2.3', name: 'Instalación de iluminación cercha inferior',
                          peso: 0.25, inicio: '2026-05-24', fin: '2026-05-29', duracion: '5 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.7.2.4', name: 'Apantallamiento (REUBICADA)',
                  peso: 0.1, inicio: '2026-05-05', fin: '2026-05-15', duracion: '10 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '10.7.3', name: 'COMUNICACIONES',
              peso: 0.05, inicio: '2026-05-20', fin: '2026-06-26', duracion: '37 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.7.3.1', name: 'Zona izquierda',
                  peso: 0.5, inicio: '2026-05-20', fin: '2026-06-26', duracion: '37 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.7.3.1.1', name: 'Corrientes débiles',
                      peso: 0.5, inicio: '2026-05-20', fin: '2026-05-22', duracion: '2 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.3.1.1.1', name: 'Instalación y conexiones de equipos en racks de comunicaciones',
                          peso: 0.6, inicio: '2026-05-20', fin: '2026-05-21', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.3.1.1.2', name: 'Pruebas',
                          peso: 0.4, inicio: '2026-05-21', fin: '2026-05-22', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.7.3.1.2', name: 'Pruebas de cargadores y dispensadores',
                      peso: 0.5, inicio: '2026-06-19', fin: '2026-06-26', duracion: '7 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.3.1.2.1', name: 'Programación de los cargadores',
                          peso: 0.6, inicio: '2026-06-19', fin: '2026-06-22', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.3.1.2.2', name: 'Pruebas de cargadores y equipos',
                          peso: 0.4, inicio: '2026-06-22', fin: '2026-06-26', duracion: '4 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
                {
                  code: '10.7.3.2', name: 'Zona derecha',
                  peso: 0.5, inicio: '2026-05-20', fin: '2026-06-19', duracion: '30 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                  children: [
                    {
                      code: '10.7.3.2.1', name: 'Corrientes débiles',
                      peso: 0.5, inicio: '2026-05-20', fin: '2026-05-22', duracion: '2 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.3.2.1.1', name: 'Instalación y conexiones de equipos en racks de comunicaciones',
                          peso: 0.6, inicio: '2026-05-20', fin: '2026-05-21', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.3.2.1.2', name: 'Pruebas',
                          peso: 0.4, inicio: '2026-05-21', fin: '2026-05-22', duracion: '1 día',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                    {
                      code: '10.7.3.2.2', name: 'Pruebas de cargadores y dispensadores',
                      peso: 0.5, inicio: '2026-06-12', fin: '2026-06-19', duracion: '7 días',
                      avanceProg: 0.0, avanceReal: 0.0,
                      children: [
                        {
                          code: '10.7.3.2.2.1', name: 'Programación de los cargadores',
                          peso: 0.6, inicio: '2026-06-12', fin: '2026-06-15', duracion: '3 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                        {
                          code: '10.7.3.2.2.2', name: 'Pruebas de cargadores y equipos',
                          peso: 0.4, inicio: '2026-06-15', fin: '2026-06-19', duracion: '4 días',
                          avanceProg: 0.0, avanceReal: 0.0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              code: '10.7.4', name: 'REDES DETECCIÓN / EXTINCIÓN',
              peso: 0.05, inicio: '2026-04-29', fin: '2026-05-19', duracion: '20 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.7.4.1', name: 'Detección',
                  peso: 0.4, inicio: '2026-04-29', fin: '2026-05-19', duracion: '20 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.7.4.2', name: 'Extinción',
                  peso: 0.6, inicio: '2026-04-29', fin: '2026-05-19', duracion: '20 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '10.7.5', name: 'Certificación RETIE (isla 3)',
              peso: 0.05, inicio: '2026-06-24', fin: '2026-06-29', duracion: '5 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.7.6', name: 'Entrega de isla 3 a operaciones',
              peso: 0.05, inicio: '2026-06-26', fin: '2026-06-26', duracion: '0 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '10.8', name: 'LG',
          peso: 0.04, inicio: '2025-10-01', fin: '2026-06-02', duracion: '244 días',
          avanceProg: 43.1, avanceReal: 32.0,
          children: [
            {
              code: '10.8.1', name: 'Proceso documental y contractual',
              peso: 0.04, inicio: '2025-10-01', fin: '2025-12-10', duracion: '70 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.8.2', name: 'Definición requerimientos complementarios y/o específicos de obra para el Epecista',
              peso: 0.04, inicio: '2025-11-26', fin: '2025-12-11', duracion: '15 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.8.3', name: 'Proceso de abastecimiento - compras 1',
              peso: 0.05, inicio: '2025-12-11', fin: '2025-12-26', duracion: '15 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.8.4', name: 'Levantamiento de detalle técnico para implementación en patio',
              peso: 0.04, inicio: '2025-12-19', fin: '2026-01-03', duracion: '15 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.8.5', name: 'Proceso de abastecimiento - compras 2',
              peso: 0.05, inicio: '2026-01-03', fin: '2026-01-10', duracion: '7 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.8.6', name: 'Inspección técnica a los requerimientos de obra',
              peso: 0.05, inicio: '2026-03-31', fin: '2026-04-07', duracion: '7 días',
              avanceProg: 14.3, avanceReal: 100.0,
            },
            {
              code: '10.8.7', name: 'Proceso de abastecimiento - suministros',
              peso: 0.05, inicio: '2025-12-26', fin: '2026-02-25', duracion: '61 días',
              avanceProg: 100.0, avanceReal: 100.0,
            },
            {
              code: '10.8.8', name: 'Acometida fibra óptica isla 1',
              peso: 0.04, inicio: '2026-05-07', fin: '2026-05-21', duracion: '14 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.9', name: 'Acometida fibra óptica isla 2',
              peso: 0.04, inicio: '2026-05-05', fin: '2026-05-15', duracion: '10 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.10', name: 'Acometida fibra óptica isla 3',
              peso: 0.04, inicio: '2026-05-14', fin: '2026-05-20', duracion: '6 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.11', name: 'Acometida cableado en cobre isla 1. canalizaciones, rack, toma regulado',
              peso: 0.05, inicio: '2026-04-20', fin: '2026-05-04', duracion: '14 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.12', name: 'Acometida cableado en cobre isla 2. canalizaciones, rack, toma regulado',
              peso: 0.05, inicio: '2026-05-02', fin: '2026-05-16', duracion: '14 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.13', name: 'Acometida cableado en cobre isla 3. canalizaciones, rack, toma regulado',
              peso: 0.05, inicio: '2026-05-05', fin: '2026-05-19', duracion: '14 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.14', name: 'Adecuación cuarto comunicaiones principal',
              peso: 0.05, inicio: '2026-03-02', fin: '2026-03-12', duracion: '10 días',
              avanceProg: 100.0, avanceReal: 0.0,
            },
            {
              code: '10.8.15', name: 'Localización rack y UPS en cuarto de telecomunicaciones.',
              peso: 0.04, inicio: '2026-03-12', fin: '2026-03-26', duracion: '14 días',
              avanceProg: 100.0, avanceReal: 0.0,
            },
            {
              code: '10.8.16', name: 'Instalación Aire Acondicionado en cuarto de telecomunicaciones. Requiere punto electrico, y pasamuro a baño de mujeres.',
              peso: 0.05, inicio: '2026-03-12', fin: '2026-03-27', duracion: '15 días',
              avanceProg: 100.0, avanceReal: 0.0,
            },
            {
              code: '10.8.17', name: 'Instalación Access Point bahías 1, 2 y 3',
              peso: 0.02, inicio: '2026-04-20', fin: '2026-05-10', duracion: '20 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.8.17.1', name: 'Isla 1',
                  peso: 0.34, inicio: '2026-04-20', fin: '2026-04-25', duracion: '5 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.8.17.2', name: 'Isla 2',
                  peso: 0.33, inicio: '2026-05-02', fin: '2026-05-07', duracion: '5 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.8.17.3', name: 'Isla 3',
                  peso: 0.33, inicio: '2026-05-05', fin: '2026-05-10', duracion: '5 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '10.8.18', name: 'Localización equipos de control en gabinetes terminales bahías 1, 2 y 3',
              peso: 0.02, inicio: '2026-04-29', fin: '2026-05-10', duracion: '11 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.8.18.1', name: 'Isla 1',
                  peso: 0.34, inicio: '2026-05-07', fin: '2026-05-10', duracion: '3 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.8.18.2', name: 'Isla 2',
                  peso: 0.33, inicio: '2026-05-05', fin: '2026-05-08', duracion: '3 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.8.18.3', name: 'Isla 3',
                  peso: 0.33, inicio: '2026-04-29', fin: '2026-05-02', duracion: '3 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '10.8.19', name: 'Localización servidor y equipos de control en cuarto de telecomunicaciones',
              peso: 0.02, inicio: '2026-03-27', fin: '2026-04-03', duracion: '7 días',
              avanceProg: 71.4, avanceReal: 0.0,
            },
            {
              code: '10.8.20', name: 'Conexionado en cuarto de telecomunicaciones',
              peso: 0.04, inicio: '2026-04-03', fin: '2026-04-10', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.21', name: 'Conexionado en gabinetes terminales bahías 1, 2 y 3',
              peso: 0.04, inicio: '2026-04-25', fin: '2026-05-12', duracion: '17 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '10.8.21.1', name: 'Isla 1',
                  peso: 0.34, inicio: '2026-04-25', fin: '2026-04-28', duracion: '3 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.8.21.2', name: 'Isla 2',
                  peso: 0.33, inicio: '2026-05-07', fin: '2026-05-09', duracion: '2 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '10.8.21.3', name: 'Isla 3',
                  peso: 0.33, inicio: '2026-05-10', fin: '2026-05-12', duracion: '2 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '10.8.22', name: 'Adecuación y conexión Workstation',
              peso: 0.04, inicio: '2026-05-12', fin: '2026-05-19', duracion: '7 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.23', name: 'Configuración y parametrización',
              peso: 0.04, inicio: '2026-05-12', fin: '2026-05-26', duracion: '14 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
            {
              code: '10.8.24', name: 'Estabilización, pruebas funcionales y entrega',
              peso: 0.05, inicio: '2026-05-19', fin: '2026-06-02', duracion: '14 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
      ],
    },
    {
      code: '11', name: 'ENERGIZACIÓN',
      peso: 0.04, inicio: '2026-04-21', fin: '2026-09-13', duracion: '145 días',
      avanceProg: 0.0, avanceReal: 0.0,
      children: [
        {
          code: '11.1', name: 'MANIOBRA ENERGIZACIÓN ISLA 1',
          peso: 0.34, inicio: '2026-04-21', fin: '2026-07-01', duracion: '71 días',
          avanceProg: 0.0, avanceReal: 0.0,
          children: [
            {
              code: '11.1.1', name: 'FASE 1: Revisión documental',
              peso: 0.4, inicio: '2026-04-21', fin: '2026-05-27', duracion: '36 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '11.1.1.1', name: 'Revisión documental CODENSA FASE 1 - CREG 075 de 2021',
                  peso: 0.7, inicio: '2026-04-21', fin: '2026-05-12', duracion: '21 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '11.1.1.2', name: 'Visita de obra',
                  peso: 0.3, inicio: '2026-05-12', fin: '2026-05-27', duracion: '15 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '11.1.2', name: 'FASE 2: Programación Energización - CREG 158 de 2010',
              peso: 0.6, inicio: '2026-05-27', fin: '2026-07-01', duracion: '35 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '11.1.2.1', name: 'Previsita de medida',
                  peso: 0.5, inicio: '2026-05-27', fin: '2026-06-11', duracion: '15 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '11.1.2.2', name: 'Energización e instalación de medida',
                  peso: 0.5, inicio: '2026-06-11', fin: '2026-07-01', duracion: '20 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
          ],
        },
        {
          code: '11.2', name: 'MANIOBRA ENERGIZACIÓN ISLA 2',
          peso: 0.33, inicio: '2026-06-30', fin: '2026-09-13', duracion: '75 días',
          avanceProg: 0.0, avanceReal: 0.0,
          children: [
            {
              code: '11.2.1', name: 'FASE 1: Revisión documental',
              peso: 0.4, inicio: '2026-06-30', fin: '2026-08-09', duracion: '40 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '11.2.1.1', name: 'Revisión documental CODENSA FASE 1 - CREG 075 de 2021',
                  peso: 0.7, inicio: '2026-06-30', fin: '2026-07-25', duracion: '25 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '11.2.1.2', name: 'Visita de obra',
                  peso: 0.3, inicio: '2026-07-25', fin: '2026-08-09', duracion: '15 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '11.2.2', name: 'FASE 2: Programación Energización - CREG 158 de 2010',
              peso: 0.6, inicio: '2026-08-09', fin: '2026-09-13', duracion: '35 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '11.2.2.1', name: 'Previsita de medida',
                  peso: 0.5, inicio: '2026-08-09', fin: '2026-08-24', duracion: '15 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '11.2.2.2', name: 'Energización e instalación de medida',
                  peso: 0.5, inicio: '2026-08-24', fin: '2026-09-13', duracion: '20 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
          ],
        },
        {
          code: '11.3', name: 'MANIOBRA ENERGIZACIÓN ISLA 3',
          peso: 0.33, inicio: '2026-06-30', fin: '2026-09-13', duracion: '75 días',
          avanceProg: 0.0, avanceReal: 0.0,
          children: [
            {
              code: '11.3.1', name: 'FASE 1: Revisión documental',
              peso: 0.4, inicio: '2026-06-30', fin: '2026-08-09', duracion: '40 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '11.3.1.1', name: 'Revisión documental CODENSA FASE 1 - CREG 075 de 2021',
                  peso: 0.7, inicio: '2026-06-30', fin: '2026-07-25', duracion: '25 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '11.3.1.2', name: 'Visita de obra',
                  peso: 0.3, inicio: '2026-07-25', fin: '2026-08-09', duracion: '15 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
            {
              code: '11.3.2', name: 'FASE 2: Programación Energización - CREG 158 de 2010',
              peso: 0.6, inicio: '2026-08-09', fin: '2026-09-13', duracion: '35 días',
              avanceProg: 0.0, avanceReal: 0.0,
              children: [
                {
                  code: '11.3.2.1', name: 'Previsita de medida',
                  peso: 0.5, inicio: '2026-08-09', fin: '2026-08-24', duracion: '15 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
                {
                  code: '11.3.2.2', name: 'Energización e instalación de medida',
                  peso: 0.5, inicio: '2026-08-24', fin: '2026-09-13', duracion: '20 días',
                  avanceProg: 0.0, avanceReal: 0.0,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      code: '12', name: 'PUESTA EN MARCHA',
      peso: 0.01, inicio: '2026-07-01', fin: '2026-09-16', duracion: '77 días',
      avanceProg: 0.0, avanceReal: 0.0,
      children: [
        {
          code: '12.1', name: 'Isla 1',
          peso: 0.34, inicio: '2026-07-01', fin: '2026-07-04', duracion: '3 días',
          avanceProg: 0.0, avanceReal: 0.0,
          children: [
            {
              code: '12.1.1', name: 'Prueba de recarga',
              peso: 1.0, inicio: '2026-07-01', fin: '2026-07-04', duracion: '3 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '12.2', name: 'Isla 2',
          peso: 0.33, inicio: '2026-09-13', fin: '2026-09-16', duracion: '3 días',
          avanceProg: 0.0, avanceReal: 0.0,
          children: [
            {
              code: '12.2.1', name: 'Prueba de recarga',
              peso: 1.0, inicio: '2026-09-13', fin: '2026-09-16', duracion: '3 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
        {
          code: '12.3', name: 'Isla 3',
          peso: 0.33, inicio: '2026-09-13', fin: '2026-09-16', duracion: '3 días',
          avanceProg: 0.0, avanceReal: 0.0,
          children: [
            {
              code: '12.3.1', name: 'Prueba de recarga',
              peso: 1.0, inicio: '2026-09-13', fin: '2026-09-16', duracion: '3 días',
              avanceProg: 0.0, avanceReal: 0.0,
            },
          ],
        },
      ],
    },
];

export default cronograma;

