export interface Feature {
  id: string;
  name: string;
  type: string;
  start: number;
  end: number;
  direction: 'forward' | 'reverse';
  color?: string;
  notes?: string;
  selected?: boolean;
} 