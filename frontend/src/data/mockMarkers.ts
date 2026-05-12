export type MarkerType = 'poi' | 'attivita' | 'evento';
export type Affollamento = 'green' | 'yellow' | 'red';

export interface Marker {
  id: string;
  name: string;
  type: MarkerType;
  status: Affollamento;
  x: number;
  y: number;
  certified?: boolean;
}

export const mockMarkers: Marker[] = [
  { id: '1', name: 'Piazza Duomo', type: 'poi', status: 'green', x: 20, y: 24 },
  { id: '2', name: 'Partita di calcetto', type: 'attivita', status: 'yellow', x: 41, y: 56 },
  { id: '3', name: 'Festival Jazz Trento', type: 'evento', status: 'red', x: 68, y: 43, certified: true },
  { id: '4', name: 'Parcheggio Centro', type: 'poi', status: 'yellow', x: 78, y: 72 },
];
