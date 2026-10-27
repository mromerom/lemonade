import type { Text } from '../../types';
import { andres } from './andres';
import { mercado } from './mercado';

export const texts: Text[] = [mercado, andres];

export function getText(id: string): Text | undefined {
  return texts.find((t) => t.id === id);
}
