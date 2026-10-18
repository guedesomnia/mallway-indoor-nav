import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  MapPin, 
  QrCode, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Clock, 
  Store, 
  Printer, 
  Trash2, 
  ExternalLink, 
  Image as ImageIcon,
  CheckCircle2,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { BuildingMap, FloorLevel } from '../types/map';

interface MasterTeamDashboardProps {
  shoppings: BuildingMap[];
  onSelectShoppingForAdmin: (shoppingId: string) => void;
  onSelectShoppingForApp: (shoppingId: string) => void;
  onCreateShopping: (newShopping: BuildingMap) => void;
  onDeleteShopping: (shoppingId: string) => void;
  onResetAllShoppings: () => void;
}

export const MasterTeamDashboard: React.FC<MasterTeamDashboardProps> = ({
  shoppings,
  onSelectShoppingForAdmin,
  onSelectShoppingForApp,
  onCreateShopping,
  onDeleteShopping,
  onResetAllShoppings,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qrModalShopping, setQrModalShopping] = useState<BuildingMap | null>(null);

  // Formulário de Novo Shopping
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('Rio de Janeiro');
  const [newState, setNewState] = useState('RJ');
  const [newAddress, setNewAddress] = useState('');
  const [newEntranceName, setNewEntranceName] = useState('Entrada Principal (Portão A)');
  const [uploadedFloorImage, setUploadedFloorImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFloorImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const shoppingId = `shopping-${Date.now()}`;
    const floorId = `floor-${Date.now()}`;
    const entranceNodeId = `node-ent-${Date.now()}`;

    const newFloor: FloorLevel = {
      id: floorId,
      name: 'Piso 1 / Térreo',
      shortName: 'Térreo',
      elevation: 0,
      width: 900,
      height: 600,
      backgroundImage: uploadedFloorImage || undefined,
      backgroundOpacity: 0.95,
    };

    const newMall: BuildingMap = {
      id: shoppingId,
      name: newName.trim(),
      address: newAddress.trim() || `${newCity}, ${newState}`,
      city: newCity.trim(),
      state: newState.trim(),
      status: 'active',
      logoBadge: newName.trim().substring(0, 2).toUpperCase(),
      floors: [newFloor],
      units: [],
      nodes: [
        {
          id: entranceNodeId,
          floorId: floorId,
          x: 450,
          y: 540,
          type: 'courier_parking',
          label: newEntranceName.trim() || 'Entrada Principal (Acesso QR Code)',
        },
      ],
      edges: [],
      verticalConnectors: [],
    };

    onCreateShopping(newMall);
    setIsCreateModalOpen(false);
    setNewName('');
    setNewAddress('');
    setUploadedFloorImage(null);
  };

  // Métricas Globais da Plataforma
  const totalStores = shoppings.reduce((acc, s) => acc + s.units.length, 0);
  const totalNodes = shoppings.reduce((acc, s) => acc + s.nodes.length, 0);
  const totalEntrances = shoppings.reduce(
    (acc, s) => acc + s.nodes.filter(n => n.type === 'entrance' || n.type === 'courier_parking').length, 
    0
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Master */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg text-white tracking-tight">WayfindMall</h1>
                <span className="text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full uppercase">
                  Master B2B Dashboard
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Plataforma de Gestão de Mapeamento Indoor & Wayfinding para Shopping Centers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onResetAllShoppings}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Restaurar Catálogo Base
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
            >
              <Plus size={16} />
              <span>Novo Shopping</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full p-6 flex-1 space-y-8">
        {/* Banner de Estatísticas Globais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{shoppings.length}</p>
              <p className="text-xs text-slate-400 font-medium">Shoppings Cadastrados</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Store size={24} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{totalStores}</p>
              <p className="text-xs text-slate-400 font-medium">Lojas & Praças Mapeadas</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <QrCode size={24} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{totalEntrances}</p>
              <p className="text-xs text-slate-400 font-medium">Pontos de Entrada / QR Codes</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">3min40s</p>
              <p className="text-xs text-slate-400 font-medium">Tempo Médio de Retirada</p>
            </div>
          </div>
        </div>

        {/* Seção de Catálogo de Shoppings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Complexos Comerciais Ativos</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  {shoppings.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecione um shopping para gerenciar a planta e lojas, ou visualize a experiência do cliente/entregador.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shoppings.map((shopping) => {
              const entranceCount = shopping.nodes.filter(
                n => n.type === 'entrance' || n.type === 'courier_parking'
              ).length;
              const hasCustomFloorplan = !!shopping.floors[0]?.backgroundImage;

              return (
                <div
                  key={shopping.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all group hover:-translate-y-1"
                >
                  <div>
                    {/* Top Card */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md">
                          {shopping.logoBadge || shopping.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-base text-white group-hover:text-emerald-400 transition-colors leading-tight">
                            {shopping.name}
                          </h3>
                          <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                            <MapPin size={12} className="text-emerald-500" />
                            <span>{shopping.city || 'Rio de Janeiro'}, {shopping.state || 'RJ'}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    </div>

                    {/* Preview da Planta / Thumbnail */}
                    <div className="h-32 bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden relative mb-4 flex items-center justify-center">
                      {shopping.floors[0]?.backgroundImage ? (
                        <img
                          src={shopping.floors[0].backgroundImage}
                          alt={shopping.name}
                          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-500">
                          <Layers size={24} />
                          <span className="text-[11px]">Planta Esquemática Vetorial</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-slate-950/90 backdrop-blur px-2 py-0.5 rounded-md text-[10px] text-slate-300 font-mono border border-slate-800">
                        {shopping.floors.length} {shopping.floors.length === 1 ? 'andar' : 'andares'} • {hasCustomFloorplan ? 'Planta Oficial' : 'Planta Esboço'}
                      </div>
                    </div>

                    {/* Chips de Informações */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <p className="text-xs font-bold text-white">{shopping.units.length}</p>
                        <p className="text-[10px] text-slate-500">Lojas</p>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <p className="text-xs font-bold text-white">{entranceCount}</p>
                        <p className="text-[10px] text-slate-500">Portões QR</p>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <p className="text-xs font-bold text-white">{shopping.edges.length}</p>
                        <p className="text-[10px] text-slate-500">Rotas</p>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Shopping */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => onSelectShoppingForAdmin(shopping.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
                    >
                      <Building2 size={14} className="text-emerald-400" />
                      <span>Abrir Painel & Editor do Shopping</span>
                      <ArrowRight size={13} className="ml-auto" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectShoppingForApp(shopping.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        title="Simular experiência do cliente escaneando o QR Code"
                      >
                        <ExternalLink size={13} />
                        <span>Ver App (QR Code)</span>
                      </button>

                      <button
                        onClick={() => setQrModalShopping(shopping)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        title="Ver e Imprimir Placas de QR Code"
                      >
                        <QrCode size={15} />
                      </button>

                      {shoppings.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Deseja remover o ${shopping.name}?`)) {
                              onDeleteShopping(shopping.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition-colors"
                          title="Remover Shopping"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* MODAL 1: CRIAR NOVO SHOPPING */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Cadastrar Novo Shopping Center</h3>
                  <p className="text-[11px] text-slate-400">Insira as informações do novo complexo comercial</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Nome do Shopping:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Shopping Leblon, Rio Sul, ParkShopping"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-slate-300 block mb-1 font-semibold">Cidade:</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">UF:</label>
                  <input
                    type="text"
                    required
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Endereço Completo:</label>
                <input
                  type="text"
                  placeholder="Ex: Av. Afrânio de Melo Franco, 290 - Leblon"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Entrada Principal com QR Code:</label>
                <input
                  type="text"
                  placeholder="Ex: Portão Acesso Entregadores / Pilastra 01"
                  value={newEntranceName}
                  onChange={(e) => setNewEntranceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Planta Baixa Arquitetônica (PNG ou JPG):
                </label>
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-colors">
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-slate-300">
                    {uploadedFloorImage ? '✓ Planta selecionada com sucesso' : 'Carregar imagem da planta'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/25"
                >
                  Criar Shopping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VISUALIZAR E IMPRIMIR QR CODES */}
      {qrModalShopping && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Placas de QR Code • {qrModalShopping.name}</h3>
                <p className="text-xs text-slate-400">Imprima para colar nos pilares, totens e entradas de serviço</p>
              </div>
              <button
                onClick={() => setQrModalShopping(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {qrModalShopping.nodes
                .filter(n => n.type === 'entrance' || n.type === 'courier_parking')
                .map((entrance) => (
                  <div
                    key={entrance.id}
                    className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-white p-2 rounded-xl shrink-0 flex items-center justify-center shadow-md">
                        <QrCode size={48} className="text-slate-900" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{entrance.label || 'Entrada'}</h4>
                        <p className="text-xs text-slate-400">ID: {entrance.id}</p>
                        <span className="text-[10px] text-emerald-400 font-semibold mt-1 inline-block">
                          ✓ Pronto para impressão e leitura com câmera
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <Printer size={13} />
                      <span>Imprimir</span>
                    </button>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setQrModalShopping(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
