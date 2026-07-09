export interface CronogramaStats {
  weekLabel: string;
  dateLabel: string;
  planned: number;
  real: number;
  spi: number;
}

export function getCronogramaStats(_projectId: string): CronogramaStats {
  return {
    weekLabel: 'S-00',
    dateLabel: 'Sin iniciar',
    planned: 0,
    real: 0,
    spi: 0,
  };
}
