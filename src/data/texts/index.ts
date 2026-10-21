import type { Text } from '../../types';
import { mercado } from './mercado';

export const texts: Text[] = [mercado];

export function getText(id: string): Text | undefined {
  return texts.find((t) => t.id === id);
}
