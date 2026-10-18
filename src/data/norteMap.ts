import { BuildingMap } from '../types/map';

export const NORTE_SHOPPING_MAP: BuildingMap = {
  id: 'norteshopping-oficial',
  name: 'NorteShopping',
  address: 'Av. Dom Hélder Câmara, 5474 - Cachambi, Rio de Janeiro - RJ',
  city: 'Rio de Janeiro',
  state: 'RJ',
  status: 'active',
  logoBadge: 'NS',
  floors: [
    {
      id: 'floor-norte-1',
      name: 'Piso 1 / Pátio',
      shortName: 'Piso 1',
      elevation: 1,
      width: 860,
      height: 580,
      backgroundOpacity: 0.2
    }
  ],
  units: [
    {
      id: 'unit-outback-norte',
      floorId: 'floor-norte-1',
      name: 'Outback Steakhouse',
      code: 'Loja 214',
      category: 'food',
      color: '#8B1A1A',
      polygon: [
        { x: 120, y: 100 },
        { x: 260, y: 100 },
        { x: 260, y: 220 },
        { x: 120, y: 220 }
      ],
      door: { x: 190, y: 220 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Balcão de Motoboy Pátio',
        notes: 'Acesso rápido pela alameda de restaurantes'
      },
      logo: '🥩',
      bgColor: '#8B1A1A',
      logoColor: '#ffffff',
      sector: 'Pátio Norte',
      distance: 140,
      description: 'Carnes nobres, costela ao barbecue e chopp na caneca congelada'
    },
    {
      id: 'unit-tastelab-norte',
      floorId: 'floor-norte-1',
      name: 'Taste Lab (Polo Gastronômico)',
      code: 'Taste Lab',
      category: 'food',
      color: '#d97706',
      polygon: [
        { x: 320, y: 100 },
        { x: 500, y: 100 },
        { x: 500, y: 220 },
        { x: 320, y: 220 }
      ],
      door: { x: 410, y: 220 },
      courierPickup: {
        isRestricted: false,
        windowName: 'Balcão Central Coletivo',
        notes: 'Polo com diversos restaurantes artesanais'
      },
      logo: '🍽️',
      bgColor: '#d97706',
      logoColor: '#ffffff',
      sector: 'Taste Lab',
      distance: 190,
      description: 'Espaço gastronômico com chefs renomados e culinária internacional'
    },
    {
      id: 'unit-mcdonalds-norte',
      floorId: 'floor-norte-1',
      name: "McDonald's",
      code: 'Loja 108',
      category: 'food',
      color: '#DA291C',
      polygon: [
        { x: 560, y: 100 },
        { x: 700, y: 100 },
        { x: 700, y: 220 },
        { x: 560, y: 220 }
      ],
      door: { x: 630, y: 220 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Balcão Delivery Exclusivo'
      },
      logo: 'M',
      bgColor: '#DA291C',
      logoColor: '#FFC72C',
      sector: 'Praça de Alimentação',
      distance: 210,
      description: 'Hambúrgueres, batatas fritas e sorvetes'
    },
    {
      id: 'unit-zara-norte',
      floorId: 'floor-norte-1',
      name: 'Zara',
      code: 'Âncora 1',
      category: 'apparel',
      color: '#18181b',
      polygon: [
        { x: 120, y: 340 },
        { x: 320, y: 340 },
        { x: 320, y: 500 },
        { x: 120, y: 500 }
      ],
      door: { x: 220, y: 340 },
      logo: '👗',
      bgColor: '#18181b',
      logoColor: '#ffffff',
      sector: 'Alameda Principal',
      distance: 180,
      description: 'Moda internacional feminina, masculina e infantil'
    },
    {
      id: 'unit-renner-norte',
      floorId: 'floor-norte-1',
      name: 'Lojas Renner',
      code: 'Âncora 2',
      category: 'apparel',
      color: '#dc2626',
      polygon: [
        { x: 400, y: 340 },
        { x: 680, y: 340 },
        { x: 680, y: 500 },
        { x: 400, y: 500 }
      ],
      door: { x: 540, y: 340 },
      logo: '🛍️',
      bgColor: '#dc2626',
      logoColor: '#ffffff',
      sector: 'Ala Dom Hélder',
      distance: 240,
      description: 'Roupas, calçados e perfumaria'
    }
  ],
  nodes: [
    { id: 'node-norte-ent-patio', floorId: 'floor-norte-1', x: 80, y: 280, type: 'courier_parking', label: 'Entrada Pátio Norte (Motos & Delivery)' },
    { id: 'node-norte-ent-principal', floorId: 'floor-norte-1', x: 410, y: 530, type: 'entrance', label: 'Entrada Principal Av. Dom Hélder' },
    { id: 'node-norte-hall-w', floorId: 'floor-norte-1', x: 190, y: 280, type: 'corridor', label: 'Alameda Restaurantes Oeste' },
    { id: 'node-norte-hall-c', floorId: 'floor-norte-1', x: 410, y: 280, type: 'corridor', label: 'Átrio Central' },
    { id: 'node-norte-hall-e', floorId: 'floor-norte-1', x: 630, y: 280, type: 'corridor', label: 'Alameda Leste' },
    { id: 'node-norte-door-outback', floorId: 'floor-norte-1', x: 190, y: 220, type: 'corridor', label: 'Porta Outback' },
    { id: 'node-norte-door-tastelab', floorId: 'floor-norte-1', x: 410, y: 220, type: 'corridor', label: 'Porta Taste Lab' },
    { id: 'node-norte-door-mc', floorId: 'floor-norte-1', x: 630, y: 220, type: 'corridor', label: "Porta McDonald's" },
    { id: 'node-norte-door-zara', floorId: 'floor-norte-1', x: 220, y: 340, type: 'corridor', label: 'Porta Zara' },
    { id: 'node-norte-door-renner', floorId: 'floor-norte-1', x: 540, y: 340, type: 'corridor', label: 'Porta Renner' }
  ],
  edges: [
    { id: 'ne-1', floorId: 'floor-norte-1', nodeA: 'node-norte-ent-patio', nodeB: 'node-norte-hall-w', distance: 35 },
    { id: 'ne-2', floorId: 'floor-norte-1', nodeA: 'node-norte-hall-w', nodeB: 'node-norte-hall-c', distance: 60 },
    { id: 'ne-3', floorId: 'floor-norte-1', nodeA: 'node-norte-hall-c', nodeB: 'node-norte-hall-e', distance: 65 },
    { id: 'ne-4', floorId: 'floor-norte-1', nodeA: 'node-norte-hall-c', nodeB: 'node-norte-ent-principal', distance: 80 },
    { id: 'ne-5', floorId: 'floor-norte-1', nodeA: 'node-norte-hall-w', nodeB: 'node-norte-door-outback', distance: 20 },
    { id: 'ne-6', floorId: 'floor-norte-1', nodeA: 'node-norte-hall-c', nodeB: 'node-norte-door-tastelab', distance: 20 },
    { id: 'ne-7', floorId: 'floor-norte-1', nodeA: 'node-norte-hall-e', nodeB: 'node-norte-door-mc', distance: 20 },
    { id: 'ne-8', floorId: 'floor-norte-1', nodeA: 'node-norte-hall-w', nodeB: 'node-norte-door-zara', distance: 35 },
    { id: 'ne-9', floorId: 'floor-norte-1', nodeA: 'node-norte-hall-c', nodeB: 'node-norte-door-renner', distance: 40 }
  ],
  verticalConnectors: []
};
