// Dados dos restaurantes e pontos de retirada do Bangu Shopping
export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  bgColor: string;
  logoColor: string;
  location: string;
  floor: string;
  sector: string;
  distance: number; // metros
  storeNumber: string;
  pickupInstructions: string[];
  courierInfo: string;
  routeSteps: RouteStep[];
  totalRoutes: number;
}

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

export interface Entrance {
  id: string;
  name: string;
  label: string;
  description: string;
}

export const ENTRANCES: Entrance[] = [
  { 
    id: 'node-ent-feira', 
    name: 'Entrada Rua da Feira', 
    label: 'Acesso Principal de Motoboys', 
    description: 'Estacionamento de motos & balcão Bar do Adão' 
  },
  { 
    id: 'node-ent-estacionamento', 
    name: 'Estacionamento Superior (Ponto E)', 
    label: 'Acesso Norte & Carga', 
    description: 'Próximo ao Atacadão e Casas Bahia' 
  },
  { 
    id: 'node-ent-acudes', 
    name: 'Entrada Rua dos Açudes', 
    label: 'Acesso Oeste', 
    description: 'Entrada direta para Praça 1 e Outback' 
  },
  { 
    id: 'node-ent-fonseca', 
    name: 'Entrada Rua Fonseca', 
    label: 'Acesso Leste', 
    description: 'Próximo à Kalunga, Riachuelo e Theatro Bangu' 
  },
];

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'outback-bangu',
    name: 'Outback Steakhouse',
    logo: '🥩',
    bgColor: '#8B1A1A',
    logoColor: '#ffffff',
    location: 'Ala Açudes',
    floor: 'Piso Térreo',
    sector: 'Setor Noroeste',
    distance: 240,
    storeNumber: 'Loja 110',
    pickupInstructions: [
      'Retirada de delivery pelo balcão lateral exclusivo',
      'Tocar o interfone de motoboys na porta dos fundos',
      'Apresentar número do pedido no display'
    ],
    courierInfo: 'Acesso preferencial pelo corredor norte',
    totalRoutes: 182,
    routeSteps: [
      {
        id: 'out-1', step: 1, totalSteps: 3,
        title: 'Entrada Rua da Feira',
        description: 'Siga pelo corredor central em frente à C&A por 120m.',
        icon: 'walk'
      },
      {
        id: 'out-2', step: 2, totalSteps: 3,
        title: 'Vire à esquerda no cruzamento Norte',
        description: 'Passe em frente às Lojas Americanas por 80m.',
        icon: 'walk',
        hasPhoto: true,
        photoDescription: 'Corredor Lojas Americanas ➔ Outback'
      },
      {
        id: 'out-3', step: 3, totalSteps: 3,
        title: 'Chegada ao Outback',
        description: 'Loja 110 – Balcão exclusivo de delivery à esquerda.',
        icon: 'destination'
      }
    ]
  },
  {
    id: 'bar-do-adao',
    name: 'Bar do Adão',
    logo: '🥟',
    bgColor: '#b45309',
    logoColor: '#ffffff',
    location: 'Entrada Rua da Feira',
    floor: 'Piso Térreo',
    sector: 'Setor Sul',
    distance: 60,
    storeNumber: 'Loja 102',
    pickupInstructions: [
      'Balcão rápido de pastéis virado para a entrada',
      'Fila expressa para entregadores de app',
      'Retirada imediata para pedidos embalados'
    ],
    courierInfo: 'Loja de acesso imediato a 60 metros da vaga de moto',
    totalRoutes: 215,
    routeSteps: [
      {
        id: 'adao-1', step: 1, totalSteps: 2,
        title: 'Acesso Rua da Feira',
        description: 'Entre pela portaria principal de motos.',
        icon: 'walk'
      },
      {
        id: 'adao-2', step: 2, totalSteps: 2,
        title: 'Chegada ao Bar do Adão',
        description: 'Balcão de retirada logo à sua direita.',
        icon: 'destination'
      }
    ]
  },
  {
    id: 'praca-alimentacao-1',
    name: 'Praça de Alimentação (Açudes)',
    logo: '🍔',
    bgColor: '#f59e0b',
    logoColor: '#ffffff',
    location: 'Ala Açudes',
    floor: 'Piso Térreo',
    sector: 'Setor Oeste',
    distance: 180,
    storeNumber: 'Pólo Fast Food',
    pickupInstructions: [
      'Pólo integrado: McDonald\'s, Burger King, Spoleto e Bob\'s',
      'Balcão central de apoio ao entregador',
      'Identificar o número do pedido no totem do restaurante'
    ],
    courierInfo: 'Próximo à entrada lateral da Rua dos Açudes',
    totalRoutes: 340,
    routeSteps: [
      {
        id: 'pra1-1', step: 1, totalSteps: 3,
        title: 'Suba pelo corredor central',
        description: 'Passe pela Centauro e Di Santini por 90m.',
        icon: 'walk'
      },
      {
        id: 'pra1-2', step: 2, totalSteps: 3,
        title: 'Vire à esquerda na Ri Happy',
        description: 'Siga no corredor dos sanitários em direção à Rua dos Açudes.',
        icon: 'walk',
        hasPhoto: true,
        photoDescription: 'Passagem entre Ri Happy e Praça 1'
      },
      {
        id: 'pra1-3', step: 3, totalSteps: 3,
        title: 'Praça de Alimentação 1',
        description: 'Área com todos os quiosques de fast food.',
        icon: 'destination'
      }
    ]
  },
  {
    id: 'praca-alimentacao-2',
    name: 'Praça de Alimentação Central',
    logo: '🍕',
    bgColor: '#ea580c',
    logoColor: '#ffffff',
    location: 'Pátio Central',
    floor: 'Piso Térreo',
    sector: 'Setor Sudeste',
    distance: 190,
    storeNumber: 'Pólo Gourmet',
    pickupInstructions: [
      'Área com balcões de pizza, cafés e massas',
      'Apoio com tomadas e assentos para entregadores'
    ],
    courierInfo: 'Pátio amplo entre Cinesystem e Marisa',
    totalRoutes: 160,
    routeSteps: [
      {
        id: 'pra2-1', step: 1, totalSteps: 2,
        title: 'Siga pelo corredor sudeste',
        description: 'Passe pelo Bar do Adão e vire à direita.',
        icon: 'walk'
      },
      {
        id: 'pra2-2', step: 2, totalSteps: 2,
        title: 'Praça Central',
        description: 'Balcões de atendimento integrados.',
        icon: 'destination'
      }
    ]
  },
  {
    id: 'gigante-nordestino',
    name: 'Gigante Nordestino',
    logo: '🍖',
    bgColor: '#9a3412',
    logoColor: '#ffffff',
    location: 'Ala Açudes',
    floor: 'Piso Térreo',
    sector: 'Setor Sudoeste',
    distance: 210,
    storeNumber: 'Loja 105',
    pickupInstructions: [
      'Balcão lateral de embalagens térmicas',
      'Informar nome do cliente e código do app'
    ],
    courierInfo: 'Ao lado do Pula Park',
    totalRoutes: 94,
    routeSteps: [
      {
        id: 'gig-1', step: 1, totalSteps: 2,
        title: 'Siga contornando a C&A',
        description: 'Acesse o corredor dos fundos à esquerda.',
        icon: 'walk'
      },
      {
        id: 'gig-2', step: 2, totalSteps: 2,
        title: 'Chegada ao Gigante Nordestino',
        description: 'Loja 105 – balcão de retirada to-go.',
        icon: 'destination'
      }
    ]
  },
  {
    id: 'cinesystem',
    name: 'Cinesystem (Bomboniere)',
    logo: '🎬',
    bgColor: '#7c3aed',
    logoColor: '#ffffff',
    location: 'Centro do Shopping',
    floor: 'Piso Térreo',
    sector: 'Setor Central',
    distance: 220,
    storeNumber: 'Complexo Cinema',
    pickupInstructions: [
      'Balcão de retirada de pipocas, nachos e combos',
      'Fila exclusiva para delivery do cinema'
    ],
    courierInfo: 'Hall de entrada do cinema',
    totalRoutes: 75,
    routeSteps: [
      {
        id: 'cine-1', step: 1, totalSteps: 2,
        title: 'Siga pelo corredor central',
        description: 'Passe por Di Santini até o átrio do Cinesystem.',
        icon: 'walk'
      },
      {
        id: 'cine-2', step: 2, totalSteps: 2,
        title: 'Bilheteria e Bomboniere',
        description: 'Apresentar código do pedido no balcão 1.',
        icon: 'destination'
      }
    ]
  }
];

export const HOURLY_DATA = [
  { hour: '08h', routes: 14 },
  { hour: '10h', routes: 38 },
  { hour: '11h', routes: 85 },
  { hour: '12h', routes: 142 },
  { hour: '13h', routes: 128 },
  { hour: '14h', routes: 92 },
  { hour: '16h', routes: 68 },
  { hour: '18h', routes: 110 },
  { hour: '19h', routes: 165 },
  { hour: '20h', routes: 184 },
  { hour: '21h', routes: 130 },
  { hour: '22h', routes: 45 },
];
