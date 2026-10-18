export type CategoryType = 
  | 'food' 
  | 'apparel' 
  | 'pharmacy' 
  | 'service' 
  | 'dock' 
  | 'restroom' 
  | 'parking' 
  | 'entertainment';

export interface Point {
  x: number;
  y: number;
}

export interface CourierPickupInfo {
  isRestricted: boolean;
  windowName?: string;
  notes?: string;
}

export interface StoreUnit {
  id: string;
  floorId: string;
  name: string;
  code?: string;
  category: CategoryType;
  polygon: Point[];
  color?: string;
  door: Point; // Coordenada da porta de entrada
  courierPickup?: CourierPickupInfo;
  operatingHours?: string;
  description?: string;
  customerNotes?: string;
  phone?: string;
  logo?: string;
  bgColor?: string;
  logoColor?: string;
  sector?: string;
  distance?: number;
}

export type WayNodeType = 
  | 'corridor' 
  | 'entrance' 
  | 'courier_parking' 
  | 'dock' 
  | 'vertical_connector' 
  | 'qr_anchor';

export interface WayNode {
  id: string;
  floorId: string;
  x: number;
  y: number;
  type: WayNodeType;
  label?: string;
  connectorId?: string; // Se vinculado a escada/elevador
}

export interface WayEdge {
  id: string;
  floorId: string;
  nodeA: string;
  nodeB: string;
  distance: number;
  courierOnly?: boolean;
  accessible?: boolean; // false se tiver degraus
}

export type VerticalType = 'elevator' | 'escalator' | 'stairs' | 'ramp';

export interface VerticalConnector {
  id: string;
  name: string;
  type: VerticalType;
  accessible: boolean;
  courierAllowed: boolean;
  connections: {
    floorId: string;
    nodeId: string;
  }[];
}

export interface FloorLevel {
  id: string;
  name: string;
  shortName: string; // "SS", "T", "L1", "L2"
  elevation: number;
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundOpacity?: number;
}

export interface BuildingMap {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  status?: 'active' | 'deploying' | 'draft';
  logoBadge?: string;
  floors: FloorLevel[];
  units: StoreUnit[];
  nodes: WayNode[];
  edges: WayEdge[];
  verticalConnectors: VerticalConnector[];
}

export type UserProfile = 'courier' | 'customer';

export interface RouteInstruction {
  id: string;
  floorId: string;
  floorName: string;
  title: string;
  description: string;
  iconType: 'start' | 'walk' | 'elevator' | 'stairs' | 'escalator' | 'dock' | 'destination' | 'qr';
  estimatedSeconds: number;
  hasPhoto?: boolean;
  photoDescription?: string;
}

export interface RouteResult {
  floorSegments: {
    floorId: string;
    points: Point[];
    distanceMeters: number;
  }[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  instructions: RouteInstruction[];
}
