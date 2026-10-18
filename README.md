# MallWay Pro — Sistema Comercial de Wayfinding Indoor & Gestão Logística para Shopping Centers

> **A plataforma definitiva de navegação indoor em tempo real (estilo Waze) para motoboys de delivery e visitantes em shopping centers.**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-iOS_%26_Android-FF6B6B?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

## 🏬 Visão Geral do Produto

O **MallWay Pro** resolve um dos maiores gargalos operacionais dos centros de compras da América Latina: **o tempo perdido de entregadores (iFood, Rappi, Zé Delivery) e visitantes tentando localizar lojas, praças de alimentação e cancelas de retirada**.

No caso dos shoppings — como o **Bangu Shopping**, **Barra Shopping** e **NorteShopping** no Rio de Janeiro —, um motoboy gasta tipicamente de **8 a 15 minutos** desde o estacionamento até o balcão do restaurante. Com o **MallWay Pro**, esse tempo é reduzido para **menos de 4 minutos**, via navegação curva a curva sem necessidade de instalar apps pesados nas lojas de aplicativos.

---

## ✨ Funcionalidades Principais

### 1. 📱 App do Motoboy & Cliente (PWA Mobile First)
- **Leitor Real de QR Code via Câmera:** Escaneie placas nas entradas e cancelas (ex: `MOTO-ENTRADA-1`, `PRAÇA-ALIMENTACAO`) diretamente pelo navegador com streaming de alta precisão via `BarcodeDetector API`.
- **Navegação Curva a Curva Indoor Estilo Waze:**
  - Traçado dinâmico em SVG com algoritmo de caminho mínimo sobre a planta real do shopping.
  - Indicador pulsante do usuário com odômetro de passos e cálculo de tempo estimado de chegada (ETA).
  - Panning e zoom interativos com suporte a gestos de toque em smartphones.
- **Orientação por Voz e Efeitos Sonoros:**
  - Instruções sonoras nativas faladas em português brasileiro (`pt-BR`) via Web Speech API.
  - Alertas sonoros polifônicos (chimes) sintetizados em tempo real via Web Audio API para início de rota, curvas e chegada vitoriosa.
- **Modo Câmera Realidade Aumentada (AR):**
  - Projeção de setas holográficas 3D em tempo real sobre a imagem capturada da câmera do smartphone, indicando exatamente onde virar no corredor.
- **Simulador de Caminhada em Tempo Real:** Permite testar o progresso autônomo do entregador andando pelos corredores do shopping.

### 2. 🛡️ Painel Administrativo de Cada Shopping
- **Gestão de Lojas e Pontos de Interesse (POIs):** Adicione, edite e posicione lojas com nomes, categorias (Alimentação, Moda, Eletrônicos), números de loja e coordenadas (X, Y).
- **Editor Visual de Nós & Grafo de Corredores:** Configure pontos de passagem, conexões transitáveis e obstáculos na planta baixa.
- **Mapa de Calor Térmico (Heatmap):** Visualização em tempo real das áreas e corredores de maior tráfego para prevenção de gargalos operacionais.
- **BI Executivo & Auditoria de SLA:**
  - Média de tempo Cancela-ao-Balcão (meta < 5 min).
  - Taxa de retenção e volume de entregadores simultâneos.
  - Exportação direta de relatórios para PDF (`window.print()`).

### 3. 🌐 Dashboard Master Multi-Shopping
- Gestão centralizada de redes de shopping centers.
- Ativação/desativação de unidades (Bangu Shopping, Barra Shopping, NorteShopping).
- Monitoramento do status dos grafos, número de lojas ativas e taxa de conclusão de rotas em tempo real.

---

## 📱 Suporte Nativo Mobile (iPhone & Android)

O sistema foi rigorosamente otimizado para navegadores mobile:
- **iPhone (iOS Safari):**
  - Suporte completo a `viewport-fit=cover` e Safe Area Insets (`env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`).
  - Modo `apple-mobile-web-app-capable` para execução sem barras do Safari ao ser adicionado à Tela de Início.
  - Desativação de gestos conflitantes de zoom duplo e elástico do Safari.
- **Android (Google Chrome):**
  - Manifesto PWA configurado com `display: standalone` e tema escuro (`#020617`).
  - Adaptação perfeita ao punch-hole da câmera e à barra de gestos do Android.
- **Desktop Simulator com Hot-Switch:**
  - Alternância imediata entre mockup de **iPhone 16 Pro** (com Dynamic Island ativa), **Galaxy S24** (com punch-hole) e **Modo Panorâmico**.
  - Modal com **QR Code em tempo real** apontando para o IP da rede local para testes simultâneos no celular físico.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend Core** | React 19, TypeScript 6, Vite 8 |
| **Estilização** | Tailwind CSS v4, Lucide React (ícones vetoriais) |
| **Gráficos & BI** | Recharts (gráficos de barras e dispersão operacional) |
| **Áudio & Voz** | Web Speech API (`SpeechSynthesis`), Web Audio API (`AudioContext`) |
| **Visão Computacional** | WebRTC MediaStream (`getUserMedia`), BarcodeDetector API |
| **Renderização Cartográfica** | SVG Vetorial Responsivo com matrizes de transformação (Pan/Zoom) |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- `npm` ou `pnpm`

### Instalação

```bash
# Clone o repositório
git clone https://github.com/guedesomnia/mallway-indoor-nav.git

# Acesse o diretório
cd mallway-indoor-nav

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

O terminal exibirá:
```
  VITE v8.3.0  ready in 250 ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: http://192.168.0.X:5174/
```

Abra o endereço Network no navegador do seu smartphone conectado ao mesmo Wi-Fi para testar a câmera, voz e Realidade Aumentada.

---

## 📦 Estrutura de Pastas

```
barra-nav/
├── public/
│   ├── manifest.json              # Manifesto PWA para instalação no celular
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── AdminPanel.tsx         # Painel administrativo do shopping (CRUD + BI)
│   │   ├── InteractiveMapCanvas.tsx # Motor de renderização SVG, Pan/Zoom e Heatmap
│   │   ├── MasterAdmin.tsx        # Portal Master Multi-Shopping
│   │   └── QRScannerModal.tsx     # Modal de captura e decodificação de QR Code
│   ├── data/
│   │   └── mallData.ts            # Grafos e lojas do Bangu, Barra e NorteShopping
│   ├── screens/
│   │   ├── Screen1QR.tsx          # Tela de boas-vindas com câmera e pontos de partida
│   │   ├── Screen2Search.tsx       # Catálogo e busca instantânea de restaurantes/lojas
│   │   ├── Screen3RoutePreview.tsx # Resumo do trajeto, distância e tempo estimado
│   │   └── Screen4Map.tsx          # Navegação viva com áudio TTS, AR e odômetro
│   ├── utils/
│   │   ├── audioNavigation.ts     # Síntese de voz pt-BR e chimes polifônicos Waze
│   │   └── pathfinding.ts         # Algoritmo de Dijkstra para menor caminho no grafo
│   ├── App.tsx                    # Orquestrador com simulador de devices e switch de personas
│   ├── index.css                  # Folha de estilos com regras mobile-first e safe areas
│   └── main.tsx                   # Ponto de entrada React
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📄 Licença

Propriedade de **Jean Guedes / Omnia Softwares**. Todos os direitos reservados.
