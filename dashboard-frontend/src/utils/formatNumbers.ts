/**
 * Formatting utilities for numbers in the application.
 * All monetary values are displayed in Colombian Pesos (COP)
 * with abbreviations: MM (Miles de millones), M (millones), K (miles)
 */

/**
 * Format a number in Colombian Pesos dynamically
 * - >= 1,000,000,000 -> MM
 * - >= 1,000,000 -> M
 * - >= 1,000 -> K
 * Separador de miles: "."
 * Separador decimal: ","
 */
export const formatCOP = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0';

  const absValue = Math.abs(numValue);
  const isNegative = numValue < 0;

  let scaledValue = absValue;
  let suffix = '';
  let decimals = 2;

  if (absValue >= 1_000_000_000) {
    scaledValue = absValue / 1_000_000_000;
    suffix = ' MM';
  } else if (absValue >= 1_000_000) {
    scaledValue = absValue / 1_000_000;
    suffix = ' M';
  } else if (absValue >= 1_000) {
    scaledValue = absValue / 1_000;
    suffix = ' K';
  } else {
    decimals = 0;
  }

  if (scaledValue % 1 === 0) decimals = 0;

  const parts = scaledValue.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formatted = parts.join(',');

  return `${isNegative ? '-' : ''}${formatted}${suffix}`;
};

/**
 * Format a number as full currency (for detailed views)
 * Example: 16745324700 → "$ 16.745.324.700"
 */
export const formatCOPFull = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '$ 0';
  
  const isNegative = numValue < 0;
  const hasDecimals = numValue % 1 !== 0;
  const parts = Math.abs(numValue).toFixed(hasDecimals ? 10 : 0).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  if (hasDecimals) {
    const dec = parts[1].replace(/0+$/, '');
    if (dec.length > 0) {
      return `${isNegative ? '-' : ''}$ ${parts[0]},${dec}`;
    }
  }
  return `${isNegative ? '-' : ''}$ ${parts[0]}`;
};

/**
 * Format a percentage
 * Example: 52.22 → "52,22%"
 */
export const formatPercent = (value: number, decimals = 2): string => {
  const formatted = value.toFixed(decimals).replace('.', ',');
  return `${formatted}%`;
};

/**
 * Format a ratio/index
 * Example: 0.73 → "0,73"
 */
export const formatRatio = (value: number, decimals = 2): string => {
  return value.toFixed(decimals).replace('.', ',');
};
