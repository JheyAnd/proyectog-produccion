// SOLO PARA SEED MANUAL O TESTING. NO USAR COMO FALLBACK EN PRODUCCIÓN.
// Estos datos corresponden exclusivamente al proyecto Patio de Operación Sur (OE 1035).

export const GRUPOS_CV = [
  {
    id: 'suministro',
    nombre: 'Suministro',
    color: '#1b5eab',
    items: [
      { id: 'redes-mt',         cap: 'Redes MT (Celdas)',        venta: 2893959054, costo: 2046582157 },
      { id: 'subestaciones',    cap: 'Subestaciones (Shelter)',  venta: 3406137000, costo: 2692179338 },
      { id: 'transformadores',  cap: 'Transformadores',          venta: 2338037308, costo: 2115002279 },
      { id: 'bt',               cap: 'Baja Tensión (BT)',        venta: 3856386116, costo: 2864635880 },
      { id: 'spe',              cap: 'SPE y SPT',                venta: 262823529,  costo: 257800000  },
      { id: 'comunicaciones',   cap: 'Comunicaciones',           venta: 701469115,  costo: 264839198  },
      { id: 'cargadores',       cap: 'Cargadores',               venta: 6743603237, costo: 5330376000 },
      { id: 'deteccion',        cap: 'Detección Incendios',      venta: 270082618,  costo: 227943849  },
      { id: 'obras-civiles',    cap: 'Obras Civiles y Redes',    venta: 8177142400, costo: 6537881527 },
    ],
  },
  {
    id: 'mano-obra',
    nombre: 'Mano de Obra',
    color: '#16a34a',
    items: [
      { id: 'estudios',         cap: 'Estudios y Diseños',       venta: 419047180,  costo: 312727205  },
      { id: 'conexion-red',     cap: 'Conexión a la Red',        venta: 519268407,  costo: 369435063  },
      { id: 'inst-cargadores',  cap: 'Instalación Cargadores',   venta: 261567164,  costo: 191000000  },
      { id: 'iluminacion',      cap: 'ILU y Servicios Aux',      venta: 147984032,  costo: 125786428  },
    ],
  },
  {
    id: 'administracion',
    nombre: 'Administración',
    color: '#7c3aed',
    items: [
      { id: 'tramites',         cap: 'Trámites y Certificaciones', venta: 679896358, costo: 186229084 },
    ],
  },
  {
    id: 'intereses',
    nombre: 'Intereses',
    color: '#f59e0b',
    items: [
      { id: 'comp-reactiva',    cap: 'Compensación Reactiva',    venta: 547200000,  costo: 751864128  },
    ],
  },
];

export const EXTRA_ITEMS = [
  { id: 'iva-cargadores', label: 'IVA Cargadores',       venta: 337180162,  costo: 247981000  },
  { id: 'its',            label: 'ITS',                   venta: 444548919,  costo: 382907200  },
  { id: 'adm-11',         label: 'Administración (11%)',       venta: 3734163668, costo: 2444728897 },
  { id: 'imprev-2',       label: 'Imprevistos (2%)',           venta: 649419768,  costo: 485485643  },
  { id: 'utilidad-4',     label: 'Utilidad (4%)',              venta: 1298839537, costo: 0          },
  { id: 'ivau-19',        label: 'IVA sobre Utilidad (19%)',   venta: 246779512,  costo: 246779512  },
  { id: 'financiacion',   label: 'Financiación 9 m.',          venta: 3077349397, costo: 1375000000 },
];

export const INITIAL_EGRESOS_CATEGORIAS = [
  { id: 'mat-accesorios', grupo: 'materiales', nombre: 'ACCESORIOS GENERALES', valores: { '2026-02': 63396800, '2026-03': 792375502, '2026-04': 840100702, '2026-05': 3325500, '2026-06': 425984127, '2026-07': 196432280, '2026-08': 224707778, '2026-09': 113929620 } },
  { id: 'mat-aparatos', grupo: 'materiales', nombre: 'APARATOS', valores: { '2025-12': 1521565, '2026-02': 19805040, '2026-03': 174870247, '2026-04': 192660747, '2026-05': 993962963, '2026-06': 243433426, '2026-07': 243433426, '2026-08': 150635865 } },
  { id: 'mat-cables', grupo: 'materiales', nombre: 'CABLES ELECTRICOS', valores: { '2025-12': 10000000, '2026-02': 2565000, '2026-03': 16470748, '2026-04': 260091668, '2026-05': 243433426, '2026-06': 83673667, '2026-07': 83673667, '2026-08': 368295250 } },
  { id: 'mat-dotacion', grupo: 'materiales', nombre: 'DOTACION', valores: { '2026-02': 441904855, '2026-04': 251021000, '2026-05': 83673667, '2026-06': 19960920, '2026-07': 19960920, '2026-08': 221666667 } },
  { id: 'mat-ductos', grupo: 'materiales', nombre: 'DUCTOS Y CANASTILLAS', valores: { '2026-02': 810246566, '2026-04': 128329280, '2026-05': 19960920, '2026-06': 200847820, '2026-07': 368295250, '2026-08': 324853135 } },
  { id: 'mat-generico', grupo: 'materiales', nombre: 'GENERICO', valores: { '2026-02': 254236471, '2026-04': 301271730, '2026-05': 69485535, '2026-06': 221666667, '2026-07': 221666667, '2026-08': 83333333 } },
  { id: 'mat-herramienta', grupo: 'materiales', nombre: 'HERRAMIENTA', valores: { '2026-02': 59910600, '2026-04': 9673821, '2026-05': 368295250, '2026-06': 91906651, '2026-07': 324853135, '2026-08': 232892249 } },
  { id: 'mat-luminarias', grupo: 'materiales', nombre: 'LUMINARIAS', valores: { '2026-02': 69485534, '2026-04': 18896223, '2026-05': 193817128, '2026-06': 83333333, '2026-07': 83333333 } },
  { id: 'mat-papeleria', grupo: 'materiales', nombre: 'PAPELERIA Y ASEO', valores: { '2026-02': 351483685, '2026-04': 91177540, '2026-05': 68383155, '2026-06': 68383155 } },
  { id: 'mat-redes', grupo: 'materiales', nombre: 'REDES Y/O EQUIPOS ESPECIALES', valores: { '2026-02': 368295250, '2026-04': 105935679, '2026-05': 79451759, '2026-06': 79451759 } },
  { id: 'mat-seguridad', grupo: 'materiales', nombre: 'SEGURIDAD INDUSTRIAL', valores: { '2026-02': 4231824600, '2026-04': 74549956, '2026-05': 55912467, '2026-06': 55912467 } },
  { id: 'mat-servicios', grupo: 'materiales', nombre: 'SERVICIOS', valores: { '2026-02': 288497730, '2026-04': 34075000 } },
  { id: 'mat-subestaciones', grupo: 'materiales', nombre: 'SUBESTACIONES', valores: { '2026-02': 115848782, '2026-04': 17785000 } },
  { id: 'mat-tableros', grupo: 'materiales', nombre: 'TABLEROS Y GABINETES', valores: { '2026-02': 42855065, '2026-04': 3600000 } },
  { id: 'mat-tuberia', grupo: 'materiales', nombre: 'TUBERIA', valores: { '2026-02': 39401866, '2026-04': 5000000 } },
  { id: 'mat-vozdatos', grupo: 'materiales', nombre: 'VOZ Y DATOS', valores: {} },
  { id: 'mo-operativa', grupo: 'mano_obra', nombre: 'Mano de Obra Operativa', valores: { '2026-01': 3144103, '2026-02': 10040371, '2026-03': 23803102, '2026-04': 66555966, '2026-05': 163541294, '2026-06': 204426618, '2026-07': 204426618, '2026-08': 204426618, '2026-09': 102213309, '2026-10': 54513765 } },
  { id: 'mo-he-operativa', grupo: 'mano_obra', nombre: 'Horas extras Personal Operativo', valores: { '2026-05': 24855473, '2026-06': 31069342, '2026-07': 31069342, '2026-08': 31069342 } },
  { id: 'mo-administrativa', grupo: 'mano_obra', nombre: 'Mano de Obra Administrativa', valores: { '2026-01': 16028936, '2026-02': 28373549, '2026-03': 50730454, '2026-04': 51317648, '2026-05': 55974543, '2026-06': 65536356, '2026-07': 65536356, '2026-08': 65536356, '2026-09': 59217557, '2026-10': 51354348 } },
  { id: 'mo-he-administrativa', grupo: 'mano_obra', nombre: 'Horas extras Personal Administrativo', valores: { '2026-05': 3803870, '2026-06': 4292882, '2026-07': 4292882, '2026-08': 4292882 } },
  { id: 'mo-coordinadores', grupo: 'mano_obra', nombre: 'Coordinadores', valores: {} },
  { id: 'adm-arrendamientos', grupo: 'administracion', nombre: 'Arrendamientos', valores: { '2025-11': 25360, '2025-12': 2343348, '2026-01': 1952790, '2026-02': 2052750, '2026-03': 2364054, '2026-04': 4000000, '2026-05': 10000000, '2026-06': 4000000, '2026-07': 10000000, '2026-08': 10000000, '2026-09': 4000000, '2026-10': 2000000 } },
  { id: 'adm-cajas', grupo: 'administracion', nombre: 'Cajas menores', valores: { '2026-01': 250570, '2026-02': 1187730, '2026-03': 3838866, '2026-04': 3000000, '2026-05': 3000000, '2026-06': 3000000, '2026-07': 3000000, '2026-08': 3000000, '2026-09': 3000000, '2026-10': 3000000 } },
  { id: 'adm-examenes', grupo: 'administracion', nombre: 'Examenes Medicos Y Procesos De Afiliacion', valores: { '2025-12': 476200, '2026-01': 162000, '2026-04': 2500000, '2026-05': 5000000, '2026-06': 2500000, '2026-09': 8000000 } },
  { id: 'adm-polizas', grupo: 'administracion', nombre: 'Polizas De Obras', valores: { '2026-02': 235139267 } },
  { id: 'adm-serv-publicos', grupo: 'administracion', nombre: 'Servicios Publicos', valores: { '2025-11': 202300, '2025-12': 81741212, '2026-01': 27137950, '2026-02': 84539210, '2026-03': 500000, '2026-04': 500000, '2026-05': 500000, '2026-06': 500000, '2026-07': 500000, '2026-08': 500000, '2026-09': 500000, '2026-10': 500000 } },
  { id: 'adm-tiquetes', grupo: 'administracion', nombre: 'Tiquetes Aereos', valores: { '2025-11': 752684, '2025-12': 8768588, '2026-01': 7751387, '2026-02': 2684360, '2026-03': 7000000, '2026-04': 7000000, '2026-05': 7000000, '2026-06': 7000000, '2026-07': 7000000, '2026-08': 7000000, '2026-09': 7000000, '2026-10': 7000000 } },
  { id: 'adm-transportes', grupo: 'administracion', nombre: 'Transportes', valores: { '2025-12': 12905849, '2026-01': 1847448, '2026-02': 31485269, '2026-03': 1200000, '2026-04': 2000000, '2026-05': 5000000, '2026-06': 5000000, '2026-07': 2000000, '2026-08': 2000000, '2026-09': 2000000, '2026-10': 2000000 } },
  { id: 'adm-viaticos', grupo: 'administracion', nombre: 'Viaticos', valores: { '2026-02': 4500000, '2026-03': 4500000, '2026-04': 4500000, '2026-05': 4500000, '2026-06': 4500000, '2026-07': 4500000, '2026-08': 4500000, '2026-09': 4500000, '2026-10': 4500000 } },
  { id: 'ing-anticipo', grupo: 'ingreso', nombre: 'Anticipo', valores: {} },
  { id: 'ing-cortes', grupo: 'ingreso', nombre: 'Cortes de obra', valores: { '2026-02': 16745324701, '2026-04': 1760762365, '2026-05': 2646124246, '2026-06': 976658824, '2026-07': 855247557, '2026-08': 856740893, '2026-11': 17839203647 } },
  { id: 'ing-aiu', grupo: 'ingreso', nombre: 'AIU', valores: {} },
  { id: 'ing-deducciones', grupo: 'ingreso', nombre: 'Deducciones', valores: {} },
  { id: 'ing-amortizacion', grupo: 'ingreso', nombre: 'Amortización', valores: {} },
  { id: 'ing-garantia', grupo: 'ingreso', nombre: 'Retención Garantía', valores: {} },
  { id: 'ing-devolucion', grupo: 'ingreso', nombre: 'Devolución ingreso retenido (garantía)', valores: {} },
  { id: 'ing-iva', grupo: 'ingreso', nombre: 'IVA descontable', valores: {} },
];
