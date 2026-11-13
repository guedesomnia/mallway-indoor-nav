export interface RouteStep {
  id: string;
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  icon: string;
  hasPhoto?: boolean;
  photoDescription?: string;
  connectorType?: 'elevator' | 'stairs' | 'escalator';
}

/** Visão de uma loja para as telas do app (derivada de StoreUnit; id == StoreUnit.id). */
export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  bgColor: string;
  logoColor: string;
  location: string;
  floor: string;
  sector: string;
  distance: number; // metros reais da rota calculada; 0 quando ainda não há rota
  storeNumber: string;
  pickupInstructions: string[];
  courierInfo: string;
  totalRoutes: number;
  routeSteps: RouteStep[];
}
