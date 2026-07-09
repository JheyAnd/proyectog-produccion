export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '$0';
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
};

export const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return dateStr.replace(' 202', ' '); // Ene 2026 -> Ene 26
};

export const formatPercentage = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0%';
  return `${numValue.toFixed(1)}%`;
};
