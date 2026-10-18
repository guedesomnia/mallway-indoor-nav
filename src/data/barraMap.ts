import { BuildingMap } from '../types/map';

export const BARRA_SHOPPING_MAP: BuildingMap = {
  id: 'barrashopping-oficial',
  name: 'BarraShopping',
  address: 'Av. das Américas, 4666 - Barra da Tijuca, Rio de Janeiro - RJ',
  floors: [
    {
      id: 'floor-l1',
      name: 'Piso 1 (L1)',
      shortName: 'L1',
      elevation: 1,
      width: 800,
      height: 520,
      backgroundOpacity: 0.15
    },
    {
      id: 'floor-l2',
      name: 'Piso 2 (L2)',
      shortName: 'L2',
      elevation: 2,
      width: 800,
      height: 520,
      backgroundOpacity: 0.15
    }
  ],
  units: [
    // === PISO L1 ===
    {
      id: 'unit-mcdonalds',
      floorId: 'floor-l1',
      name: "McDonald's",
      code: 'Loja 142',
      category: 'food',
      color: '#DA291C',
      polygon: [
        { x: 480, y: 80 },
        { x: 620, y: 80 },
        { x: 620, y: 190 },
        { x: 480, y: 190 }
      ],
      door: { x: 550, y: 190 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Balcão Lateral - Exclusivo Delivery',
        notes: 'Identificar-se no balcão de delivery com o número do pedido'
      },
      logo: 'M',
      bgColor: '#DA291C',
      logoColor: '#FFC72C',
      sector: 'Setor Central',
      distance: 180,
      description: 'Lanches rápidos, combos e sobremesas'
    },
    {
      id: 'unit-spoleto',
      floorId: 'floor-l1',
      name: 'Spoleto',
      code: 'Loja 156',
      category: 'food',
      color: '#009951',
      polygon: [
        { x: 650, y: 80 },
        { x: 750, y: 80 },
        { x: 750, y: 190 },
        { x: 650, y: 190 }
      ],
      door: { x: 700, y: 190 },
      courierPickup: {
        isRestricted: false,
        windowName: 'Balcão Frontal',
        notes: 'Fila exclusiva para motoboy'
      },
      logo: 'S',
      bgColor: '#009951',
      logoColor: '#ffffff',
      sector: 'Setor Leste',
      distance: 190,
      description: 'Massas artesanais e saladas'
    },
    {
      id: 'unit-reidomate',
      floorId: 'floor-l1',
      name: 'Rei do Mate',
      code: 'Loja 112',
      category: 'food',
      color: '#2d6a4f',
      polygon: [
        { x: 650, y: 320 },
        { x: 750, y: 320 },
        { x: 750, y: 440 },
        { x: 650, y: 440 }
      ],
      door: { x: 650, y: 380 },
      courierPickup: {
        isRestricted: false,
        windowName: 'Balcão Rápido'
      },
      logo: '🧉',
      bgColor: '#2d6a4f',
      logoColor: '#ffffff',
      sector: 'Setor Sul',
      distance: 210,
      description: 'Chás mate, pães de queijo e cafés'
    },
    {
      id: 'unit-madero',
      floorId: 'floor-l1',
      name: 'Madero Container & Burger',
      code: 'Loja 187',
      category: 'food',
      color: '#1a1a1a',
      polygon: [
        { x: 280, y: 80 },
        { x: 420, y: 80 },
        { x: 420, y: 190 },
        { x: 280, y: 190 }
      ],
      door: { x: 350, y: 190 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Porta Lateral dos Fundos',
        notes: 'Apresentar código no interfone lateral'
      },
      logo: 'M',
      bgColor: '#1a1a1a',
      logoColor: '#d4af37',
      sector: 'Setor Norte',
      distance: 250,
      description: 'Hambúrgueres artesanais e carnes na brasa'
    },

    // === PISO L2 ===
    {
      id: 'unit-outback',
      floorId: 'floor-l2',
      name: 'Outback Steakhouse',
      code: 'Loja 261',
      category: 'food',
      color: '#8B1A1A',
      polygon: [
        { x: 480, y: 70 },
        { x: 720, y: 70 },
        { x: 720, y: 220 },
        { x: 480, y: 220 }
      ],
      door: { x: 500, y: 150 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Balcão Lateral - Exclusivo Motoboy',
        notes: 'Acesso pelo portão verde nos fundos, interfone do delivery'
      },
      logo: '🥩',
      bgColor: '#8B1A1A',
      logoColor: '#ffffff',
      sector: 'Setor Oeste',
      distance: 320,
      description: 'Steaks nobres, costela ao barbecue e porções'
    }
  ],
  nodes: [
    // === NÓS PISO L1 ===
    { id: 'node-entrance-b', floorId: 'floor-l1', x: 80, y: 260, type: 'entrance', label: 'Entrada B (Acesso Entregadores)' },
    { id: 'node-l1-hall-west', floorId: 'floor-l1', x: 200, y: 260, type: 'corridor', label: 'Corredor Oeste' },
    { id: 'node-l1-hall-center', floorId: 'floor-l1', x: 420, y: 260, type: 'corridor', label: 'Átrio Central L1' },
    { id: 'node-l1-hall-east', floorId: 'floor-l1', x: 620, y: 260, type: 'corridor', label: 'Corredor Leste' },

    // Conectores verticais L1
    { id: 'node-l1-elevator-service', floorId: 'floor-l1', x: 200, y: 150, type: 'vertical_connector', label: 'Elevador de Serviço 2 (L1)', connectorId: 'conn-elevator-2' },
    { id: 'node-l1-escalator', floorId: 'floor-l1', x: 420, y: 180, type: 'vertical_connector', label: 'Escada Rolante Central (L1)', connectorId: 'conn-escalator-1' },

    // Portas das lojas no L1
    { id: 'node-door-madero', floorId: 'floor-l1', x: 350, y: 190, type: 'corridor', label: 'Balcão Madero' },
    { id: 'node-door-mcdonalds', floorId: 'floor-l1', x: 550, y: 190, type: 'corridor', label: "Balcão McDonald's" },
    { id: 'node-door-spoleto', floorId: 'floor-l1', x: 700, y: 190, type: 'corridor', label: 'Balcão Spoleto' },
    { id: 'node-door-reidomate', floorId: 'floor-l1', x: 650, y: 380, type: 'corridor', label: 'Balcão Rei do Mate' },

    // Estacionamento de motos L1
    { id: 'node-parking-motos', floorId: 'floor-l1', x: 80, y: 420, type: 'courier_parking', label: 'Estacionamento de Motos' },

    // === NÓS PISO L2 ===
    { id: 'node-l2-elevator-service', floorId: 'floor-l2', x: 200, y: 150, type: 'vertical_connector', label: 'Elevador de Serviço 2 (L2)', connectorId: 'conn-elevator-2' },
    { id: 'node-l2-escalator', floorId: 'floor-l2', x: 420, y: 180, type: 'vertical_connector', label: 'Escada Rolante Central (L2)', connectorId: 'conn-escalator-1' },
    { id: 'node-l2-hall-west', floorId: 'floor-l2', x: 260, y: 150, type: 'corridor', label: 'Corredor de Serviço Oeste L2' },
    { id: 'node-l2-hall-center', floorId: 'floor-l2', x: 420, y: 260, type: 'corridor', label: 'Praça Gourmet L2' },
    { id: 'node-door-outback', floorId: 'floor-l2', x: 500, y: 150, type: 'corridor', label: 'Outback Steakhouse (Loja 261)' }
  ],
  edges: [
    // === CONEXÕES PISO L1 ===
    { id: 'e-ent-hall', floorId: 'floor-l1', nodeA: 'node-entrance-b', nodeB: 'node-l1-hall-west', distance: 40 },
    { id: 'e-moto-ent', floorId: 'floor-l1', nodeA: 'node-parking-motos', nodeB: 'node-entrance-b', distance: 25 },
    { id: 'e-hall-elev', floorId: 'floor-l1', nodeA: 'node-l1-hall-west', nodeB: 'node-l1-elevator-service', distance: 30, courierOnly: true },
    { id: 'e-w-c', floorId: 'floor-l1', nodeA: 'node-l1-hall-west', nodeB: 'node-l1-hall-center', distance: 75 },
    { id: 'e-c-e', floorId: 'floor-l1', nodeA: 'node-l1-hall-center', nodeB: 'node-l1-hall-east', distance: 65 },
    { id: 'e-c-esc', floorId: 'floor-l1', nodeA: 'node-l1-hall-center', nodeB: 'node-l1-escalator', distance: 25 },
    
    // Conexões com lojas L1
    { id: 'e-madero', floorId: 'floor-l1', nodeA: 'node-l1-hall-center', nodeB: 'node-door-madero', distance: 25 },
    { id: 'e-mc', floorId: 'floor-l1', nodeA: 'node-l1-hall-center', nodeB: 'node-door-mcdonalds', distance: 35 },
    { id: 'e-spoleto', floorId: 'floor-l1', nodeA: 'node-l1-hall-east', nodeB: 'node-door-spoleto', distance: 25 },
    { id: 'e-mate', floorId: 'floor-l1', nodeA: 'node-l1-hall-east', nodeB: 'node-door-reidomate', distance: 40 },

    // === CONEXÕES PISO L2 ===
    { id: 'e-l2-elev-hall', floorId: 'floor-l2', nodeA: 'node-l2-elevator-service', nodeB: 'node-l2-hall-west', distance: 20, courierOnly: true },
    { id: 'e-l2-hall-outback', floorId: 'floor-l2', nodeA: 'node-l2-hall-west', nodeB: 'node-door-outback', distance: 70, courierOnly: true },
    { id: 'e-l2-esc-c', floorId: 'floor-l2', nodeA: 'node-l2-escalator', nodeB: 'node-l2-hall-center', distance: 25 },
    { id: 'e-l2-c-outback', floorId: 'floor-l2', nodeA: 'node-l2-hall-center', nodeB: 'node-door-outback', distance: 45 }
  ],
  verticalConnectors: [
    {
      id: 'conn-elevator-2',
      name: 'Elevador de Serviço 2',
      type: 'elevator',
      accessible: true,
      courierAllowed: true,
      connections: [
        { floorId: 'floor-l1', nodeId: 'node-l1-elevator-service' },
        { floorId: 'floor-l2', nodeId: 'node-l2-elevator-service' }
      ]
    },
    {
      id: 'conn-escalator-1',
      name: 'Escada Rolante Central',
      type: 'escalator',
      accessible: false,
      courierAllowed: true,
      connections: [
        { floorId: 'floor-l1', nodeId: 'node-l1-escalator' },
        { floorId: 'floor-l2', nodeId: 'node-l2-escalator' }
      ]
    }
  ]
};
