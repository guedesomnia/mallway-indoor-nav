import { BuildingMap } from '../types/map';

export const BANGU_SHOPPING_MAP: BuildingMap = {
  id: 'bangu-shopping-oficial',
  name: 'Bangu Shopping',
  address: 'Rua Fonseca, 240 - Bangu, Rio de Janeiro - RJ',
  floors: [
    {
      id: 'floor-terreo',
      name: 'Piso Térreo',
      shortName: 'Térreo',
      elevation: 0,
      width: 949,
      height: 1024,
      backgroundImage: '/bangu_floorplan.png',
      backgroundOpacity: 0.95
    }
  ],
  units: [
    // === RESTAURANTES E ALIMENTAÇÃO ===
    {
      id: 'unit-outback-bangu',
      floorId: 'floor-terreo',
      name: 'Outback Steakhouse',
      code: 'Loja 110',
      category: 'food',
      color: '#8B1A1A',
      polygon: [
        { x: 35, y: 260 },
        { x: 145, y: 260 },
        { x: 145, y: 335 },
        { x: 35, y: 335 }
      ],
      door: { x: 155, y: 300 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Balcão Lateral - Exclusivo Motoboy',
        notes: 'Acesso pelo corredor lateral, interfone na porta dos fundos'
      },
      logo: '🥩',
      bgColor: '#8B1A1A',
      logoColor: '#ffffff',
      sector: 'Ala Açudes',
      distance: 240,
      description: 'Steaks nobres, costela ao barbecue e porções'
    },
    {
      id: 'unit-praca-alimentacao-1',
      floorId: 'floor-terreo',
      name: 'Praça de Alimentação (Açudes)',
      code: 'Praça 1',
      category: 'food',
      color: '#f59e0b',
      polygon: [
        { x: 45, y: 470 },
        { x: 150, y: 470 },
        { x: 150, y: 565 },
        { x: 45, y: 565 }
      ],
      door: { x: 155, y: 520 },
      courierPickup: {
        isRestricted: false,
        windowName: 'Ponto Central de Retirada Delivery',
        notes: 'Quiosques e fast foods (McDonalds, BK, Spoleto)'
      },
      logo: '🍔',
      bgColor: '#d97706',
      logoColor: '#ffffff',
      sector: 'Ala Açudes',
      distance: 180,
      description: 'Polo de fast-foods e refeições rápidas'
    },
    {
      id: 'unit-praca-alimentacao-2',
      floorId: 'floor-terreo',
      name: 'Praça de Alimentação Central',
      code: 'Praça 2',
      category: 'food',
      color: '#ea580c',
      polygon: [
        { x: 580, y: 600 },
        { x: 685, y: 600 },
        { x: 685, y: 790 },
        { x: 580, y: 790 }
      ],
      door: { x: 565, y: 680 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Balcão Integrado iFood / Rappi',
        notes: 'Área com mesas de apoio e tomadas para entregadores'
      },
      logo: '🍕',
      bgColor: '#ea580c',
      logoColor: '#ffffff',
      sector: 'Pátio Central',
      distance: 190,
      description: 'Restaurantes, pizzarias e cafeterias'
    },
    {
      id: 'unit-bar-do-adao',
      floorId: 'floor-terreo',
      name: 'Bar do Adão',
      code: 'Loja 102',
      category: 'food',
      color: '#b45309',
      polygon: [
        { x: 515, y: 915 },
        { x: 605, y: 915 },
        { x: 605, y: 955 },
        { x: 515, y: 955 }
      ],
      door: { x: 560, y: 905 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Balcão de Pastéis To-Go',
        notes: 'Próximo à entrada da Rua da Feira'
      },
      logo: '🥟',
      bgColor: '#b45309',
      logoColor: '#ffffff',
      sector: 'Entrada Rua da Feira',
      distance: 60,
      description: 'Pastéis premiados, petiscos e refeições'
    },
    {
      id: 'unit-gigante-nordestino',
      floorId: 'floor-terreo',
      name: 'Gigante Nordestino',
      code: 'Loja 105',
      category: 'food',
      color: '#9a3412',
      polygon: [
        { x: 175, y: 680 },
        { x: 235, y: 680 },
        { x: 235, y: 760 },
        { x: 175, y: 760 }
      ],
      door: { x: 245, y: 720 },
      courierPickup: {
        isRestricted: false,
        windowName: 'Guichê Lateral'
      },
      logo: '🍖',
      bgColor: '#9a3412',
      logoColor: '#ffffff',
      sector: 'Ala Açudes',
      distance: 210,
      description: 'Culinária tradicional nordestina e carnes'
    },

    // === ÂNCORAS E GRANDES LOJAS ===
    {
      id: 'unit-americanas-bangu',
      floorId: 'floor-terreo',
      name: 'Lojas Americanas',
      code: 'Âncora 1',
      category: 'apparel',
      color: '#dc2626',
      polygon: [
        { x: 220, y: 260 },
        { x: 405, y: 260 },
        { x: 405, y: 370 },
        { x: 220, y: 370 }
      ],
      door: { x: 310, y: 385 },
      courierPickup: {
        isRestricted: true,
        windowName: 'Balcão Pegue na Loja',
        notes: 'Retiradas de e-commerce e conveniência'
      },
      logo: '🛍️',
      bgColor: '#dc2626',
      logoColor: '#ffffff',
      sector: 'Norte',
      distance: 260,
      description: 'Variedades, bomboniere e eletrônicos'
    },
    {
      id: 'unit-casas-bahia',
      floorId: 'floor-terreo',
      name: 'Casas Bahia',
      code: 'Âncora 2',
      category: 'service',
      color: '#2563eb',
      polygon: [
        { x: 570, y: 260 },
        { x: 825, y: 260 },
        { x: 825, y: 415 },
        { x: 570, y: 415 }
      ],
      door: { x: 570, y: 360 },
      logo: '📺',
      bgColor: '#2563eb',
      logoColor: '#ffffff',
      sector: 'Norte',
      distance: 280,
      description: 'Eletrodomésticos, móveis e tecnologia'
    },
    {
      id: 'unit-cinesystem',
      floorId: 'floor-terreo',
      name: 'Cinesystem Cinemas',
      code: 'Lazer',
      category: 'entertainment',
      color: '#7c3aed',
      polygon: [
        { x: 435, y: 400 },
        { x: 550, y: 400 },
        { x: 550, y: 585 },
        { x: 435, y: 585 }
      ],
      door: { x: 430, y: 480 },
      courierPickup: {
        isRestricted: false,
        windowName: 'Bomboniere Cinema (Pipoca Delivery)'
      },
      logo: '🎬',
      bgColor: '#7c3aed',
      logoColor: '#ffffff',
      sector: 'Centro',
      distance: 220,
      description: 'Complexo de salas de cinema multiplex'
    },
    {
      id: 'unit-rihappy',
      floorId: 'floor-terreo',
      name: 'Ri Happy Brinquedos',
      code: 'Loja 120',
      category: 'service',
      color: '#e11d48',
      polygon: [
        { x: 190, y: 400 },
        { x: 385, y: 400 },
        { x: 385, y: 560 },
        { x: 190, y: 560 }
      ],
      door: { x: 395, y: 480 },
      logo: '🧸',
      bgColor: '#e11d48',
      logoColor: '#ffffff',
      sector: 'Centro-Oeste',
      distance: 210,
      description: 'Brinquedos infantis e presentes'
    },
    {
      id: 'unit-cea-bangu',
      floorId: 'floor-terreo',
      name: 'C&A Modas',
      code: 'Âncora 3',
      category: 'apparel',
      color: '#0284c7',
      polygon: [
        { x: 260, y: 565 },
        { x: 400, y: 565 },
        { x: 400, y: 780 },
        { x: 260, y: 780 }
      ],
      door: { x: 410, y: 680 },
      logo: '👗',
      bgColor: '#0284c7',
      logoColor: '#ffffff',
      sector: 'Sul',
      distance: 190,
      description: 'Moda e vestuário'
    },
    {
      id: 'unit-o-amigao',
      floorId: 'floor-terreo',
      name: 'O Amigão',
      code: 'Loja 130',
      category: 'service',
      color: '#059669',
      polygon: [
        { x: 265, y: 790 },
        { x: 400, y: 790 },
        { x: 400, y: 910 },
        { x: 265, y: 910 }
      ],
      door: { x: 410, y: 850 },
      logo: '🏠',
      bgColor: '#059669',
      logoColor: '#ffffff',
      sector: 'Sul',
      distance: 120,
      description: 'Utilidades domésticas e decoração'
    },
    {
      id: 'unit-riachuelo-bangu',
      floorId: 'floor-terreo',
      name: 'Riachuelo',
      code: 'Âncora 4',
      category: 'apparel',
      color: '#18181b',
      polygon: [
        { x: 725, y: 415 },
        { x: 835, y: 415 },
        { x: 835, y: 645 },
        { x: 725, y: 645 }
      ],
      door: { x: 715, y: 530 },
      logo: '👔',
      bgColor: '#18181b',
      logoColor: '#ffffff',
      sector: 'Leste',
      distance: 250,
      description: 'Moda casual, praia e calçados'
    },
    {
      id: 'unit-marisa-bangu',
      floorId: 'floor-terreo',
      name: 'Marisa',
      code: 'Loja 140',
      category: 'apparel',
      color: '#be185d',
      polygon: [
        { x: 725, y: 710 },
        { x: 835, y: 710 },
        { x: 835, y: 840 },
        { x: 725, y: 840 }
      ],
      door: { x: 715, y: 760 },
      logo: '👠',
      bgColor: '#be185d',
      logoColor: '#ffffff',
      sector: 'Leste',
      distance: 180,
      description: 'Moda feminina e acessórios'
    },
    {
      id: 'unit-centauro-bangu',
      floorId: 'floor-terreo',
      name: 'Centauro Esportes',
      code: 'Loja 115',
      category: 'apparel',
      color: '#dc2626',
      polygon: [
        { x: 440, y: 760 },
        { x: 550, y: 760 },
        { x: 550, y: 890 },
        { x: 440, y: 890 }
      ],
      door: { x: 430, y: 820 },
      logo: '⚽',
      bgColor: '#dc2626',
      logoColor: '#ffffff',
      sector: 'Centro-Sul',
      distance: 140,
      description: 'Artigos esportivos, tênis e camisas'
    },
    {
      id: 'unit-di-santini',
      floorId: 'floor-terreo',
      name: 'Di Santini Calçados',
      code: 'Loja 118',
      category: 'apparel',
      color: '#d97706',
      polygon: [
        { x: 440, y: 605 },
        { x: 550, y: 605 },
        { x: 550, y: 750 },
        { x: 440, y: 750 }
      ],
      door: { x: 430, y: 680 },
      logo: '👟',
      bgColor: '#d97706',
      logoColor: '#ffffff',
      sector: 'Centro',
      distance: 170,
      description: 'Calçados e bolsas'
    },
    {
      id: 'unit-kalunga-bangu',
      floorId: 'floor-terreo',
      name: 'Kalunga',
      code: 'Loja 150',
      category: 'service',
      color: '#0284c7',
      polygon: [
        { x: 860, y: 305 },
        { x: 960, y: 305 },
        { x: 960, y: 420 },
        { x: 860, y: 420 }
      ],
      door: { x: 850, y: 360 },
      logo: '📎',
      bgColor: '#0284c7',
      logoColor: '#ffffff',
      sector: 'Ala Fonseca',
      distance: 310,
      description: 'Papelaria, informática e material de escritório'
    },
    {
      id: 'unit-theatro-bangu',
      floorId: 'floor-terreo',
      name: 'Theatro Bangu',
      code: 'Cultura',
      category: 'entertainment',
      color: '#4f46e5',
      polygon: [
        { x: 880, y: 490 },
        { x: 980, y: 490 },
        { x: 980, y: 675 },
        { x: 880, y: 675 }
      ],
      door: { x: 870, y: 580 },
      logo: '🎭',
      bgColor: '#4f46e5',
      logoColor: '#ffffff',
      sector: 'Ala Fonseca',
      distance: 280,
      description: 'Espetáculos, teatro e shows'
    }
  ],
  nodes: [
    // === ENTRADAS OFICIAIS DO BANGU SHOPPING ===
    { id: 'node-ent-feira', floorId: 'floor-terreo', x: 565, y: 970, type: 'courier_parking', label: 'Entrada Rua da Feira (Ponto de Motoboys)' },
    { id: 'node-ent-estacionamento', floorId: 'floor-terreo', x: 420, y: 240, type: 'entrance', label: 'Entrada Estacionamento Superior (Ponto E)' },
    { id: 'node-ent-acudes', floorId: 'floor-terreo', x: 25, y: 520, type: 'entrance', label: 'Entrada Rua dos Açudes' },
    { id: 'node-ent-fonseca', floorId: 'floor-terreo', x: 975, y: 450, type: 'entrance', label: 'Entrada Rua Fonseca' },
    { id: 'node-ent-prof', floorId: 'floor-terreo', x: 585, y: 270, type: 'entrance', label: 'Acesso Centro Profissional' },

    // === CORREDOR SUL (RUA DA FEIRA) ===
    { id: 'node-c-sul-adao', floorId: 'floor-terreo', x: 565, y: 905, type: 'corridor', label: 'Acesso Bar do Adão' },
    { id: 'node-c-sul-bifurc', floorId: 'floor-terreo', x: 490, y: 905, type: 'corridor', label: 'Bifurcação Sul' },
    { id: 'node-c-sul-amigao', floorId: 'floor-terreo', x: 410, y: 905, type: 'corridor', label: 'Corredor O Amigão' },

    // === CORREDOR CENTRAL OESTE (ENTRE C&A E DI SANTINI/CENTAURO) ===
    { id: 'node-c-mid-amigao', floorId: 'floor-terreo', x: 410, y: 850, type: 'corridor', label: 'Porta O Amigão' },
    { id: 'node-c-mid-centauro', floorId: 'floor-terreo', x: 410, y: 820, type: 'corridor', label: 'Porta Centauro' },
    { id: 'node-c-mid-cea', floorId: 'floor-terreo', x: 410, y: 680, type: 'corridor', label: 'Porta C&A' },
    { id: 'node-c-mid-disantini', floorId: 'floor-terreo', x: 410, y: 605, type: 'corridor', label: 'Porta Di Santini' },
    { id: 'node-c-mid-rihappy', floorId: 'floor-terreo', x: 410, y: 480, type: 'corridor', label: 'Átrio Ri Happy / Sanitários' },
    { id: 'node-c-mid-norte', floorId: 'floor-terreo', x: 410, y: 385, type: 'corridor', label: 'Cruzamento Norte Americanas' },

    // === CORREDOR CENTRAL LESTE (CINESYSTEM & PRAÇA CENTRAL) ===
    { id: 'node-c-east-praca2', floorId: 'floor-terreo', x: 565, y: 680, type: 'corridor', label: 'Praça de Alimentação 2' },
    { id: 'node-c-east-cinesystem', floorId: 'floor-terreo', x: 565, y: 480, type: 'corridor', label: 'Átrio Cinesystem' },
    { id: 'node-c-east-bahia', floorId: 'floor-terreo', x: 565, y: 385, type: 'corridor', label: 'Cruzamento Casas Bahia' },

    // === CORREDOR LESTE (RIACHUELO / MARISA / THEATRO) ===
    { id: 'node-c-leste-marisa', floorId: 'floor-terreo', x: 715, y: 760, type: 'corridor', label: 'Porta Marisa' },
    { id: 'node-c-leste-riachuelo', floorId: 'floor-terreo', x: 715, y: 530, type: 'corridor', label: 'Porta Riachuelo' },
    { id: 'node-c-leste-kalunga', floorId: 'floor-terreo', x: 850, y: 360, type: 'corridor', label: 'Acesso Kalunga' },
    { id: 'node-c-leste-theatro', floorId: 'floor-terreo', x: 870, y: 580, type: 'corridor', label: 'Acesso Theatro Bangu' },

    // === CORREDOR NORTE (AMERICAS / PONTO FRIO / BAHIA / OUTBACK) ===
    { id: 'node-c-norte-ponto-frio', floorId: 'floor-terreo', x: 490, y: 385, type: 'corridor', label: 'Porta Ponto Frio' },
    { id: 'node-c-norte-americanas', floorId: 'floor-terreo', x: 310, y: 385, type: 'corridor', label: 'Porta Americanas' },
    { id: 'node-c-norte-outback', floorId: 'floor-terreo', x: 165, y: 385, type: 'corridor', label: 'Corredor Outback' },
    { id: 'node-door-outback-bangu', floorId: 'floor-terreo', x: 155, y: 300, type: 'corridor', label: 'Porta Outback Steakhouse' },

    // === CORREDOR OESTE (AÇUDES / PRAÇA 1 / GIGANTE NORDESTINO) ===
    { id: 'node-c-west-praca1', floorId: 'floor-terreo', x: 165, y: 520, type: 'corridor', label: 'Praça de Alimentação Açudes' },
    { id: 'node-c-west-pulapark', floorId: 'floor-terreo', x: 245, y: 630, type: 'corridor', label: 'Pula Park' },
    { id: 'node-c-west-gigante', floorId: 'floor-terreo', x: 245, y: 720, type: 'corridor', label: 'Gigante Nordestino' }
  ],
  edges: [
    // === ROTAS A PARTIR DA ENTRADA RUA DA FEIRA (PONTO PRINCIPAL DE MOTOS) ===
    { id: 'be-1', floorId: 'floor-terreo', nodeA: 'node-ent-feira', nodeB: 'node-c-sul-adao', distance: 65, courierOnly: false },
    { id: 'be-2', floorId: 'floor-terreo', nodeA: 'node-c-sul-adao', nodeB: 'node-c-sul-bifurc', distance: 75, courierOnly: false },
    { id: 'be-3', floorId: 'floor-terreo', nodeA: 'node-c-sul-bifurc', nodeB: 'node-c-sul-amigao', distance: 80, courierOnly: false },
    { id: 'be-4', floorId: 'floor-terreo', nodeA: 'node-c-sul-adao', nodeB: 'node-c-east-praca2', distance: 220, courierOnly: false },

    // Conexões no Corredor Central Oeste (Subindo da Rua da Feira para o Norte)
    { id: 'be-5', floorId: 'floor-terreo', nodeA: 'node-c-sul-amigao', nodeB: 'node-c-mid-amigao', distance: 55 },
    { id: 'be-6', floorId: 'floor-terreo', nodeA: 'node-c-mid-amigao', nodeB: 'node-c-mid-centauro', distance: 30 },
    { id: 'be-7', floorId: 'floor-terreo', nodeA: 'node-c-mid-centauro', nodeB: 'node-c-mid-cea', distance: 140 },
    { id: 'be-8', floorId: 'floor-terreo', nodeA: 'node-c-mid-cea', nodeB: 'node-c-mid-disantini', distance: 75 },
    { id: 'be-9', floorId: 'floor-terreo', nodeA: 'node-c-mid-disantini', nodeB: 'node-c-mid-rihappy', distance: 125 },
    { id: 'be-10', floorId: 'floor-terreo', nodeA: 'node-c-mid-rihappy', nodeB: 'node-c-mid-norte', distance: 95 },

    // Conexões no Corredor Norte
    { id: 'be-11', floorId: 'floor-terreo', nodeA: 'node-c-mid-norte', nodeB: 'node-c-norte-ponto-frio', distance: 80 },
    { id: 'be-12', floorId: 'floor-terreo', nodeA: 'node-c-norte-ponto-frio', nodeB: 'node-c-east-bahia', distance: 75 },
    { id: 'be-13', floorId: 'floor-terreo', nodeA: 'node-c-mid-norte', nodeB: 'node-c-norte-americanas', distance: 100 },
    { id: 'be-14', floorId: 'floor-terreo', nodeA: 'node-c-norte-americanas', nodeB: 'node-c-norte-outback', distance: 145 },
    { id: 'be-15', floorId: 'floor-terreo', nodeA: 'node-c-norte-outback', nodeB: 'node-door-outback-bangu', distance: 85 },

    // Conexão Estacionamento Superior (Ponto E)
    { id: 'be-16', floorId: 'floor-terreo', nodeA: 'node-ent-estacionamento', nodeB: 'node-c-mid-norte', distance: 145 },
    { id: 'be-17', floorId: 'floor-terreo', nodeA: 'node-ent-prof', nodeB: 'node-c-east-bahia', distance: 115 },

    // Conexões Corredor Cinesystem / Praça Central
    { id: 'be-18', floorId: 'floor-terreo', nodeA: 'node-c-east-bahia', nodeB: 'node-c-east-cinesystem', distance: 95 },
    { id: 'be-19', floorId: 'floor-terreo', nodeA: 'node-c-east-cinesystem', nodeB: 'node-c-east-praca2', distance: 200 },
    { id: 'be-20', floorId: 'floor-terreo', nodeA: 'node-c-mid-rihappy', nodeB: 'node-c-east-cinesystem', distance: 155 },

    // Conexões Ala Leste (Riachuelo / Marisa / Kalunga / Theatro)
    { id: 'be-21', floorId: 'floor-terreo', nodeA: 'node-c-east-bahia', nodeB: 'node-c-leste-kalunga', distance: 285 },
    { id: 'be-22', floorId: 'floor-terreo', nodeA: 'node-c-east-cinesystem', nodeB: 'node-c-leste-riachuelo', distance: 150 },
    { id: 'be-23', floorId: 'floor-terreo', nodeA: 'node-c-leste-riachuelo', nodeB: 'node-ent-fonseca', distance: 260 },
    { id: 'be-24', floorId: 'floor-terreo', nodeA: 'node-c-leste-riachuelo', nodeB: 'node-c-leste-theatro', distance: 155 },
    { id: 'be-25', floorId: 'floor-terreo', nodeA: 'node-c-east-praca2', nodeB: 'node-c-leste-marisa', distance: 150 },

    // Conexões Ala Oeste (Açudes / Praça 1 / Gigante Nordestino)
    { id: 'be-26', floorId: 'floor-terreo', nodeA: 'node-c-norte-outback', nodeB: 'node-c-west-praca1', distance: 135 },
    { id: 'be-27', floorId: 'floor-terreo', nodeA: 'node-c-west-praca1', nodeB: 'node-ent-acudes', distance: 140 },
    { id: 'be-28', floorId: 'floor-terreo', nodeA: 'node-c-west-praca1', nodeB: 'node-c-west-pulapark', distance: 110 },
    { id: 'be-29', floorId: 'floor-terreo', nodeA: 'node-c-west-pulapark', nodeB: 'node-c-west-gigante', distance: 90 },
    { id: 'be-30', floorId: 'floor-terreo', nodeA: 'node-c-west-gigante', nodeB: 'node-c-mid-cea', distance: 165 }
  ],
  verticalConnectors: []
};
