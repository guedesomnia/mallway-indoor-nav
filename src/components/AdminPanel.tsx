import React, { useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Route,
  Map,
  BarChart3,
  Settings,
  TrendingUp,
  Users,
  Clock,
  Store,
  ChevronRight,
  Pencil,
  CheckCircle2,
  Trash2,
  Plus,
  QrCode,
  Printer,
  ExternalLink,
  ArrowLeft,
  X,
  FileText,
  Flame,
  AlertTriangle,
  Download
} from 'lucide-react';
import { HOURLY_DATA } from '../data/restaurants';
import { BuildingMap, StoreUnit, Point, CategoryType } from '../types/map';
import { calculateIndoorRoute } from '../utils/pathfinding';
import { InteractiveMapCanvas } from './InteractiveMapCanvas';
import { MapStudioEditor } from './MapStudioEditor';

const BarChart = () => {
  const max = Math.max(...HOURLY_DATA.map(d => d.routes));

  return (
    <div className="flex items-end gap-1 h-20">
      {HOURLY_DATA.map((d, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all duration-700"
            style={{
              height: `${(d.routes / max) * 64}px`,
              backgroundColor: d.routes === max ? '#2563eb' : '#bfdbfe',
              minHeight: 2,
            }}
          />
          {idx % 2 === 0 && (
            <span className="text-gray-400" style={{ fontSize: 8 }}>{d.hour}</span>
          )}
        </div>
      ))}
    </div>
  );
};

type AdminSection = 'overview' | 'restaurants' | 'qrcodes' | 'routes' | 'map' | 'metrics' | 'settings';

const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Visão geral', icon: <LayoutDashboard size={16} /> },
  { id: 'restaurants', label: 'Lojas & Restaurantes', icon: <UtensilsCrossed size={16} /> },
  { id: 'map', label: 'Editor do Mapa (Studio)', icon: <Map size={16} /> },
  { id: 'qrcodes', label: 'QR Codes de Entrada', icon: <QrCode size={16} /> },
  { id: 'routes', label: 'Acessos e Portões', icon: <Route size={16} /> },
  { id: 'metrics', label: 'Relatórios de Uso', icon: <BarChart3 size={16} /> },
  { id: 'settings', label: 'Configurações do Mall', icon: <Settings size={16} /> },
];

const MetricCard = ({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) => (
  <div className="metric-card bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 shadow-sm">
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: color + '20' }}
    >
      <span style={{ color }}>{icon}</span>
    </div>
    <div>
      <p className="font-black text-gray-900 text-xl leading-none">{value}</p>
      <p className="text-gray-400 text-xs mt-0.5 font-medium">{label}</p>
    </div>
  </div>
);

interface AdminPanelProps {
  buildingMap: BuildingMap;
  onUpdateMap: (newMap: BuildingMap) => void;
  onResetMap: () => void;
  onBackToMaster: () => void;
  onOpenClientApp: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  buildingMap, 
  onUpdateMap, 
  onResetMap, 
  onBackToMaster,
  onOpenClientApp
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [activeFloorId, setActiveFloorId] = useState<string>(buildingMap.floors[0]?.id || 'floor-1');
  const [selectedUnit, setSelectedUnit] = useState<StoreUnit | null>(null);
  const [editorTool, setEditorTool] = useState<'select' | 'draw_unit' | 'add_node' | 'add_edge'>('select');
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Modal de Cadastro/Edição de Loja
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeCategory, setStoreCategory] = useState<CategoryType>('food');
  const [storeSector, setStoreSector] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storePickupNotes, setStorePickupNotes] = useState('');
  const [storeLogo, setStoreLogo] = useState('🛍️');
  const [storeColor, setStoreColor] = useState('#2563eb');

  const entrances = buildingMap.nodes.filter(n => n.type === 'entrance' || n.type === 'courier_parking');
  const firstEntranceId = entrances[0]?.id || buildingMap.nodes[0]?.id || '';
  const firstTargetId = buildingMap.nodes.find(n => n.id.includes('door') || n.id.includes('outback'))?.id || buildingMap.nodes[1]?.id || '';

  const previewRoute = calculateIndoorRoute(
    buildingMap,
    firstEntranceId,
    firstTargetId,
    'courier'
  );

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const handleAddPointToDraft = (point: Point) => {
    if (editorTool === 'draw_unit') {
      setDraftPoints(prev => [...prev, point]);
    } else if (editorTool === 'add_node') {
      const newNode = {
        id: `node-${Date.now()}`,
        floorId: activeFloorId,
        x: point.x,
        y: point.y,
        type: 'corridor' as const,
        label: `Nó ${point.x},${point.y}`
      };
      onUpdateMap({
        ...buildingMap,
        nodes: [...buildingMap.nodes, newNode]
      });
    }
  };

  const handleCanvasNodeClick = (clickedId: string) => {
    if (editorTool === 'add_edge') {
      if (!selectedNodeId) {
        setSelectedNodeId(clickedId);
      } else if (selectedNodeId !== clickedId) {
        const nodeA = buildingMap.nodes.find(n => n.id === selectedNodeId);
        const nodeB = buildingMap.nodes.find(n => n.id === clickedId);
        if (nodeA && nodeB) {
          const dist = Math.round(Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y) / 4);
          const newEdge = {
            id: `edge-${Date.now()}`,
            floorId: activeFloorId,
            nodeA: selectedNodeId,
            nodeB: clickedId,
            distance: dist,
            courierOnly: false,
            accessible: true
          };
          onUpdateMap({
            ...buildingMap,
            edges: [...buildingMap.edges, newEdge]
          });
        }
        setSelectedNodeId(null);
      }
    } else {
      setSelectedNodeId(clickedId);
    }
  };

  // Abrir Modal de Nova Loja
  const handleOpenNewStoreModal = () => {
    setEditingStoreId(null);
    setStoreName('');
    setStoreCode(`Loja ${buildingMap.units.length + 101}`);
    setStoreCategory('food');
    setStoreSector('Praça de Alimentação');
    setStoreDescription('');
    setStorePickupNotes('Retirada no balcão de delivery com código do app');
    setStoreLogo('🍴');
    setStoreColor('#2563eb');
    setIsStoreModalOpen(true);
  };

  // Abrir Modal para Editar Loja
  const handleEditStore = (unit: StoreUnit) => {
    setEditingStoreId(unit.id);
    setStoreName(unit.name);
    setStoreCode(unit.code || '');
    setStoreCategory(unit.category);
    setStoreSector(unit.sector || '');
    setStoreDescription(unit.description || '');
    setStorePickupNotes(unit.courierPickup?.notes || unit.courierPickup?.windowName || '');
    setStoreLogo(unit.logo || '🍴');
    setStoreColor(unit.color || '#2563eb');
    setIsStoreModalOpen(true);
  };

  // Salvar Loja (Criar ou Atualizar)
  const handleSaveStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;

    if (editingStoreId) {
      // Atualizar
      const updatedUnits = buildingMap.units.map(u => {
        if (u.id === editingStoreId) {
          return {
            ...u,
            name: storeName.trim(),
            code: storeCode.trim() || undefined,
            category: storeCategory,
            sector: storeSector.trim() || undefined,
            description: storeDescription.trim() || undefined,
            courierPickup: {
              isRestricted: true,
              windowName: 'Balcão de Motoboy',
              notes: storePickupNotes.trim() || undefined
            },
            logo: storeLogo,
            color: storeColor,
            bgColor: storeColor
          };
        }
        return u;
      });
      onUpdateMap({ ...buildingMap, units: updatedUnits });
    } else {
      // Criar com polígono padrão no centro do piso se não tiver desenhado
      const defaultFloor = buildingMap.floors.find(f => f.id === activeFloorId) || buildingMap.floors[0];
      const cx = Math.round(defaultFloor.width / 2);
      const cy = Math.round(defaultFloor.height / 2);

      const newUnit: StoreUnit = {
        id: `unit-${Date.now()}`,
        floorId: activeFloorId,
        name: storeName.trim(),
        code: storeCode.trim() || undefined,
        category: storeCategory,
        sector: storeSector.trim() || undefined,
        description: storeDescription.trim() || undefined,
        polygon: [
          { x: cx - 40, y: cy - 40 },
          { x: cx + 40, y: cy - 40 },
          { x: cx + 40, y: cy + 40 },
          { x: cx - 40, y: cy + 40 }
        ],
        door: { x: cx, y: cy + 40 },
        courierPickup: {
          isRestricted: true,
          windowName: 'Balcão de Delivery',
          notes: storePickupNotes.trim() || undefined
        },
        logo: storeLogo,
        color: storeColor,
        bgColor: storeColor
      };

      const newDoorNode = {
        id: `node-door-${Date.now()}`,
        floorId: activeFloorId,
        x: cx,
        y: cy + 40,
        type: 'corridor' as const,
        label: `Porta ${storeName.trim()}`
      };

      onUpdateMap({
        ...buildingMap,
        units: [...buildingMap.units, newUnit],
        nodes: [...buildingMap.nodes, newDoorNode]
      });
    }

    setIsStoreModalOpen(false);
  };

  const handleDeleteStore = (unitId: string) => {
    if (confirm('Deseja remover esta loja do mapa?')) {
      onUpdateMap({
        ...buildingMap,
        units: buildingMap.units.filter(u => u.id !== unitId)
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar do Shopping */}
      <div className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={onBackToMaster}
            className="flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:text-blue-800 mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Dashboard Master</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-sm">
              {buildingMap.logoBadge || buildingMap.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 text-sm leading-tight truncate">
                {buildingMap.name}
              </p>
              <p className="text-gray-400 text-xs">Gestão Operacional</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`sidebar-item w-full ${activeSection === item.id ? 'active' : ''}`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={onOpenClientApp}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <ExternalLink size={14} />
            <span>Abrir App do Usuário</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal do Shopping */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-gray-900 text-lg">
                {navItems.find(n => n.id === activeSection)?.label}
              </h1>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {buildingMap.name}
              </span>
            </div>
            <p className="text-gray-400 text-xs">Administração de lojas, rotas de entrega e calibração de plantas.</p>
          </div>

          <div className="flex items-center gap-3">
            <select className="text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-white font-semibold focus:outline-none">
              <option>Hoje ({today})</option>
              <option>Últimos 7 dias</option>
              <option>Último mês</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          {/* 1. VISÃO GERAL */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard
                  icon={<TrendingUp size={20} />}
                  value="1.480"
                  label="Rotas iniciadas hoje"
                  color="#2563eb"
                />
                <MetricCard
                  icon={<Users size={20} />}
                  value="214"
                  label="Entregadores ativos"
                  color="#16a34a"
                />
                <MetricCard
                  icon={<Clock size={20} />}
                  value="3min20s"
                  label="Tempo médio de retirada"
                  color="#f59e0b"
                />
                <MetricCard
                  icon={<Store size={20} />}
                  value={`${buildingMap.units.length}`}
                  label="Lojas mapeadas"
                  color="#8b5cf6"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Fluxo de Entregas por Hora</h3>
                  <p className="text-gray-400 text-xs mb-4">Volume de entregadores no shopping ao longo do dia</p>
                  <BarChart />
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm">Lojas Mais Procuradas</h3>
                    <button
                      onClick={() => setActiveSection('restaurants')}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      Ver todas ({buildingMap.units.length})
                    </button>
                  </div>
                  <div className="space-y-3">
                    {buildingMap.units.slice(0, 5).map((u, idx) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <span className="text-gray-300 font-bold text-sm w-4">{idx + 1}</span>
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                          style={{ backgroundColor: u.bgColor || '#1e293b', color: u.logoColor || '#ffffff' }}
                        >
                          {u.logo || '🛍️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-xs font-bold truncate">{u.name}</p>
                          <p className="text-gray-400 text-[10px] truncate">{u.code || u.sector}</p>
                        </div>
                        <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                          {120 - idx * 18} rotas
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prévia do Mapa */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Planta Ativa do Shopping</h3>
                    <p className="text-gray-400 text-xs">Exibição de corredores, lojas e pontos de ancoragem</p>
                  </div>
                  <button
                    onClick={() => setActiveSection('map')}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Pencil size={13} />
                    <span>Abrir Editor Studio</span>
                  </button>
                </div>

                <div className="h-80 rounded-2xl overflow-hidden border border-gray-100">
                  <InteractiveMapCanvas
                    buildingMap={buildingMap}
                    activeFloorId={activeFloorId}
                    routeResult={previewRoute}
                    selectedUnitId={buildingMap.units[0]?.id || null}
                    startNodeId={firstEntranceId}
                    targetNodeId={firstTargetId}
                    isEditorMode={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. EDITOR DO MAPA (STUDIO) */}
          {activeSection === 'map' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
              <div className="lg:col-span-8 h-full flex flex-col gap-2">
                <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                  <InteractiveMapCanvas
                    buildingMap={buildingMap}
                    activeFloorId={activeFloorId}
                    routeResult={previewRoute}
                    selectedUnitId={selectedUnit?.id || null}
                    onSelectUnit={(u) => setSelectedUnit(u)}
                    startNodeId={firstEntranceId}
                    targetNodeId={firstTargetId}
                    isEditorMode={true}
                    editorTool={editorTool}
                    draftPoints={draftPoints}
                    onAddPointToDraft={handleAddPointToDraft}
                    onCanvasNodeClick={handleCanvasNodeClick}
                    selectedNodeId={selectedNodeId}
                  />
                </div>
              </div>

              <div className="lg:col-span-4 h-full">
                <MapStudioEditor
                  buildingMap={buildingMap}
                  onUpdateMap={onUpdateMap}
                  activeFloorId={activeFloorId}
                  onFloorChange={setActiveFloorId}
                  selectedUnit={selectedUnit}
                  onSelectUnit={setSelectedUnit}
                  editorTool={editorTool}
                  setEditorTool={setEditorTool}
                  draftPoints={draftPoints}
                  onClearDraftPoints={() => setDraftPoints([])}
                  onResetToDefaultMap={onResetMap}
                />
              </div>
            </div>
          )}

          {/* 3. GESTÃO DE LOJAS & RESTAURANTES */}
          {activeSection === 'restaurants' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Lojas & Restaurantes Cadastrados</h3>
                  <p className="text-gray-400 text-xs">
                    Gerencie o catálogo de lojas, horários, fotos e descrições para clientes e motoboys.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenNewStoreModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus size={15} />
                    <span>Cadastrar Nova Loja</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {buildingMap.units.map((unit) => {
                  const floor = buildingMap.floors.find(f => f.id === unit.floorId);
                  return (
                    <div
                      key={unit.id}
                      className="p-4 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-sm"
                          style={{ backgroundColor: unit.bgColor || '#1e293b', color: unit.logoColor || '#ffffff' }}
                        >
                          {unit.logo || '🛍️'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-sm truncate">{unit.name}</h4>
                            {unit.code && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono font-bold">
                                {unit.code}
                              </span>
                            )}
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                              {unit.category}
                            </span>
                          </div>

                          <p className="text-xs text-gray-400 mt-0.5">
                            {floor?.name} • {unit.sector || 'Geral'}
                          </p>

                          {unit.courierPickup?.notes && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                              🛵 {unit.courierPickup.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleEditStore(unit)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Editar Loja"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          onClick={() => handleDeleteStore(unit.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Remover Loja"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. GERADOR DE QR CODES DE ENTRADA */}
          {activeSection === 'qrcodes' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">QR Codes das Entradas & Pilastras</h3>
                  <p className="text-xs text-gray-400">
                    Ao escanear este QR Code, o entregador ou cliente tem sua posição inicial calibrada instantaneamente.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} />
                  <span>Imprimir Todas as Placas</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entrances.map((entrance) => (
                  <div
                    key={entrance.id}
                    className="p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-emerald-500 transition-all flex items-start gap-4 shadow-sm"
                  >
                    <div className="w-24 h-24 bg-gray-50 border border-gray-200 p-2 rounded-2xl shrink-0 flex items-center justify-center shadow-inner">
                      <QrCode size={64} className="text-slate-900" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                        {entrance.type === 'courier_parking' ? 'Acesso Motos' : 'Entrada'}
                      </span>
                      <h4 className="font-black text-gray-900 text-sm mt-1">{entrance.label || 'Portão'}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">ID: {entrance.id}</p>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => window.print()}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Printer size={12} />
                          <span>Imprimir Placa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. ACESSOS E PORTÕES */}
          {activeSection === 'routes' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-base">Portões & Conectores Cadastrados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {entrances.map(e => (
                  <div key={e.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70">
                    <span className="text-xs font-bold text-emerald-700 uppercase">
                      {e.type === 'courier_parking' ? 'Doca / Motoboy' : 'Entrada Geral'}
                    </span>
                    <p className="text-sm font-bold text-gray-900 mt-1">{e.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">Coordenadas: ({e.x}, {e.y})</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. RELATÓRIOS EXECUTIVOS & BI DE TRÁFEGO (PASSO 3) */}
          {activeSection === 'metrics' && (
            <div className="space-y-6">
              {/* Header do Relatório com Exportação */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Flame size={20} />
                    </span>
                    <div>
                      <h3 className="font-black text-gray-900 text-lg">Inteligência Operacional & BI de Tráfego Indoor</h3>
                      <p className="text-gray-400 text-xs">Auditoria de tempo de deslocamento, gargalos de corredores e conformidade de lojistas.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-semibold">Período:</span>
                  <select className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3 py-2 outline-none">
                    <option>Hoje (Horário de Pico)</option>
                    <option>Últimos 7 dias</option>
                    <option>Este Mês (Consolidado)</option>
                  </select>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Exportar Relatório (PDF)</span>
                  </button>
                </div>
              </div>

              {/* 4 Cards de KPIs de SLA e Eficiência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2">
                    <span>SLA CANCELA-AO-BALCÃO</span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-extrabold">-18% tempo</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900">4.2 <span className="text-sm text-gray-400 font-semibold">min</span></p>
                  <p className="text-[11px] text-gray-500 mt-1">Meta contratual: 4.5 min (Dentro do SLA)</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2">
                    <span>DISTÂNCIA MÉDIA</span>
                    <span className="text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full font-extrabold">Otimizada</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900">168 <span className="text-sm text-gray-400 font-semibold">metros</span></p>
                  <p className="text-[11px] text-gray-500 mt-1">Redução de 85m com rota de serviço</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2">
                    <span>TEMPO MÉDIO DE ESPERA</span>
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-extrabold">Atenção</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900">2.8 <span className="text-sm text-gray-400 font-semibold">min</span></p>
                  <p className="text-[11px] text-gray-500 mt-1">Retenção nos balcões de motoboy</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2">
                    <span>ECONOMIA MENSAL</span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-extrabold">+ Produtividade</span>
                  </div>
                  <p className="text-3xl font-black text-emerald-600">384 <span className="text-sm text-gray-400 font-semibold">horas</span></p>
                  <p className="text-[11px] text-gray-500 mt-1">Economizadas pela frota no mall</p>
                </div>
              </div>

              {/* Prévia do Mapa de Calor (Heatmap) sobre a Planta Oficial */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-gray-900 text-base flex items-center gap-2">
                      <Flame size={18} className="text-amber-500" />
                      <span>Mapa de Calor de Densidade de Circulação ({buildingMap.name})</span>
                    </h4>
                    <p className="text-gray-400 text-xs">
                      Manchas térmicas indicam áreas com alta concentração de motoboys e clientes em tempo real.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>Heatmap Operacional Ativo</span>
                    </span>
                  </div>
                </div>

                <div className="h-96 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                  <InteractiveMapCanvas
                    buildingMap={buildingMap}
                    activeFloorId={activeFloorId}
                    routeResult={previewRoute}
                    selectedUnitId={buildingMap.units[0]?.id || null}
                    startNodeId={firstEntranceId}
                    targetNodeId={firstTargetId}
                    isEditorMode={false}
                    showHeatmap={true}
                  />
                </div>
              </div>

              {/* Grid: Auditoria de Retenção de Lojistas + Gargalos de Corredores */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tabela de Lojas & Tempo no Balcão */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-black text-gray-900 text-sm flex items-center justify-between">
                    <span>Auditoria de Retenção por Balcão de Loja</span>
                    <span className="text-[11px] text-gray-400 font-normal">Meta: ≤ 3.0 min</span>
                  </h4>

                  <div className="divide-y divide-gray-100 text-xs">
                    {[
                      { name: 'Outback Steakhouse', orders: 142, wait: '3.6 min', status: 'alert', note: 'Pico no jantar (20h)' },
                      { name: 'Bar do Adão', orders: 98, wait: '2.1 min', status: 'ok', note: 'Fluxo rápido' },
                      { name: 'Gigante Nordestino', orders: 84, wait: '2.4 min', status: 'ok', note: 'Balcão dedicado' },
                      { name: 'Spoleto (Praça 1)', orders: 76, wait: '1.9 min', status: 'ok', note: 'Dentro do prazo' },
                      { name: 'C&A / Moda Express', orders: 45, wait: '4.2 min', status: 'critical', note: 'Retirada no provador (demora)' },
                    ].map((row, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{row.name}</p>
                          <p className="text-gray-400 text-[10px]">{row.orders} pedidos hoje • {row.note}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-gray-900 text-xs">{row.wait}</span>
                          <span className={`block text-[10px] font-bold ${
                            row.status === 'ok' ? 'text-emerald-600' : row.status === 'alert' ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {row.status === 'ok' ? '✓ No Prazo' : row.status === 'alert' ? '⚠️ Alerta' : '🛑 Gargalo'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gargalos em Corredores e Recomendações */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-black text-gray-900 text-sm flex items-center justify-between">
                    <span>Gargalos Críticos Identificados via Sensores</span>
                    <span className="text-[11px] text-gray-400 font-normal">IA de Operações</span>
                  </h4>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-red-50/70 border border-red-200/60 rounded-xl">
                      <div className="flex items-center gap-2 text-red-900 font-bold text-xs mb-1">
                        <AlertTriangle size={15} className="text-red-600 shrink-0" />
                        <span>Corredor Central da Praça 1 (Próximo ao Outback)</span>
                      </div>
                      <p className="text-red-700 text-[11px] leading-relaxed">
                        Queda na velocidade média de caminhada para 2.4 km/h entre 12h30 e 13h40 devido à aglomeração de clientes e motoboys.
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        <span>Acesso ao Estacionamento Ponto E</span>
                      </div>
                      <p className="text-amber-700 text-[11px] leading-relaxed">
                        Concentração de motos na calçada externa. Recomenda-se reforçar a sinalização da doca de motos.
                      </p>
                    </div>

                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-1">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span>Corredor de Serviço / Doca Norte</span>
                      </div>
                      <p className="text-emerald-700 text-[11px] leading-relaxed">
                        Fluxo 100% fluido com velocidade média de 4.8 km/h. Rota de serviço funcionando com excelência.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. CONFIGURAÇÕES GERAIS DO MALL */}
          {activeSection === 'settings' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-base">Configurações Operacionais de {buildingMap.name}</h3>
              <p className="text-xs text-gray-400">
                Parâmetros de cálculo de rotas, velocidades médias e tolerâncias de geolocalização.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <label className="font-bold text-gray-700 block">Velocidade Média de Caminhada (Motoboy):</label>
                  <input type="text" defaultValue="4.5 km/h (~75 metros/minuto)" className="w-full p-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold" />
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <label className="font-bold text-gray-700 block">Tolerância do Acelerômetro Indoor:</label>
                  <input type="text" defaultValue="2.2 m/s² (Passada calibrada)" className="w-full p-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CADASTRAR/EDITAR LOJA */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base">
                {editingStoreId ? 'Editar Loja / Restaurante' : 'Cadastrar Nova Loja'}
              </h3>
              <button onClick={() => setIsStoreModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStoreSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-700 block mb-1 font-bold">Nome da Loja / Restaurante:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Outback, Spoleto, Renner, Droga Raia"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-700 block mb-1 font-bold">Número / Código:</label>
                  <input
                    type="text"
                    placeholder="Ex: Loja 210"
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-gray-700 block mb-1 font-bold">Categoria:</label>
                  <select
                    value={storeCategory}
                    onChange={(e) => setStoreCategory(e.target.value as CategoryType)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-2 text-gray-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="food">Alimentação / Restaurante</option>
                    <option value="apparel">Vestuário / Moda</option>
                    <option value="pharmacy">Farmácia / Saúde</option>
                    <option value="service">Serviços</option>
                    <option value="entertainment">Lazer / Cinema</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Setor / Ala do Shopping:</label>
                <input
                  type="text"
                  placeholder="Ex: Praça de Alimentação, Ala Norte"
                  value={storeSector}
                  onChange={(e) => setStoreSector(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Descrição para Clientes:</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Especialidades, pratos executivos, produtos da loja..."
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Orientações de Retirada (Motoboys / Delivery):</label>
                <input
                  type="text"
                  placeholder="Ex: Balcão lateral dos fundos, interfone, fila expressa..."
                  value={storePickupNotes}
                  onChange={(e) => setStorePickupNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-700 block mb-1 font-bold">Emoji / Ícone:</label>
                  <input
                    type="text"
                    value={storeLogo}
                    onChange={(e) => setStoreLogo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-emerald-500 text-center text-base"
                  />
                </div>
                <div>
                  <label className="text-gray-700 block mb-1 font-bold">Cor de Destaque:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={storeColor}
                      onChange={(e) => setStoreColor(e.target.value)}
                      className="w-10 h-9 p-0 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <span className="font-mono text-gray-500 text-xs">{storeColor}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  Salvar Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
