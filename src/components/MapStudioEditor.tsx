import React, { useState } from 'react';
import { 
  BuildingMap, 
  StoreUnit, 
  WayNode, 
  WayEdge, 
  Point, 
  CategoryType
} from '../types/map';
import { 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Layers, 
  RotateCcw, 
  Crosshair, 
  MousePointer, 
  Pencil, 
  Link2, 
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react';

interface MapStudioEditorProps {
  buildingMap: BuildingMap;
  onUpdateMap: (newMap: BuildingMap) => void;
  activeFloorId: string;
  onFloorChange: (floorId: string) => void;
  selectedUnit: StoreUnit | null;
  onSelectUnit: (unit: StoreUnit | null) => void;
  editorTool: 'select' | 'draw_unit' | 'add_node' | 'add_edge';
  setEditorTool: (tool: 'select' | 'draw_unit' | 'add_node' | 'add_edge') => void;
  draftPoints: Point[];
  onClearDraftPoints: () => void;
  onResetToDefaultMap: () => void;
}

export const MapStudioEditor: React.FC<MapStudioEditorProps> = ({
  buildingMap,
  onUpdateMap,
  activeFloorId,
  onFloorChange,
  selectedUnit,
  onSelectUnit,
  editorTool,
  setEditorTool,
  draftPoints,
  onClearDraftPoints,
  onResetToDefaultMap
}) => {
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreCategory, setNewStoreCategory] = useState<CategoryType>('food');
  const [newStoreDescription, setNewStoreDescription] = useState('');
  const [hasCourierPickup, setHasCourierPickup] = useState(true);
  const [courierWindowName, setCourierWindowName] = useState('Balcão de Motoboy');
  const [courierNotes, setCourierNotes] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const updatedFloors = buildingMap.floors.map(f => {
          if (f.id === activeFloorId) {
            return { ...f, backgroundImage: base64, backgroundOpacity: 0.35 };
          }
          return f;
        });
        onUpdateMap({ ...buildingMap, floors: updatedFloors });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStore = () => {
    if (!newStoreName.trim() || draftPoints.length < 3) return;

    const doorPoint = { ...draftPoints[0] };

    const newUnit: StoreUnit = {
      id: `unit-${Date.now()}`,
      floorId: activeFloorId,
      name: newStoreName.trim(),
      code: newStoreCode.trim() || undefined,
      category: newStoreCategory,
      polygon: [...draftPoints],
      door: doorPoint,
      description: newStoreDescription.trim() || undefined,
      courierPickup: hasCourierPickup ? {
        isRestricted: true,
        windowName: courierWindowName.trim() || 'Balcão de Retirada Delivery',
        notes: courierNotes.trim() || undefined
      } : undefined
    };

    const newNode: WayNode = {
      id: `node-${Date.now()}`,
      floorId: activeFloorId,
      x: doorPoint.x,
      y: doorPoint.y,
      type: 'corridor',
      label: `Porta ${newStoreName}`
    };

    onUpdateMap({
      ...buildingMap,
      units: [...buildingMap.units, newUnit],
      nodes: [...buildingMap.nodes, newNode]
    });

    onClearDraftPoints();
    setIsStoreModalOpen(false);
    setNewStoreName('');
    setNewStoreCode('');
    setNewStoreDescription('');
    setEditorTool('select');
  };

  const handleDeleteSelectedUnit = () => {
    if (!selectedUnit) return;
    onUpdateMap({
      ...buildingMap,
      units: buildingMap.units.filter(u => u.id !== selectedUnit.id)
    });
    onSelectUnit(null);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(buildingMap, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${buildingMap.id || 'barrashopping-mapa'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.floors && parsed.units && parsed.nodes) {
            onUpdateMap(parsed);
          }
        } catch {
          alert('Arquivo JSON inválido.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-3 bg-slate-950/90 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Pencil className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              Map Studio • BarraShopping
            </h3>
          </div>
          <button
            onClick={onResetToDefaultMap}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setEditorTool('select')}
            className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
              editorTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Mover e Inspecionar"
          >
            <MousePointer className="w-4 h-4" />
            <span className="text-[10px]">Mover</span>
          </button>

          <button
            onClick={() => setEditorTool('draw_unit')}
            className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
              editorTool === 'draw_unit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Desenhar Loja / Restaurante"
          >
            <Pencil className="w-4 h-4" />
            <span className="text-[10px]">Loja</span>
          </button>

          <button
            onClick={() => setEditorTool('add_node')}
            className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
              editorTool === 'add_node'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Criar Ponto de Passagem (Waypoint)"
          >
            <Crosshair className="w-4 h-4" />
            <span className="text-[10px]">Ponto</span>
          </button>

          <button
            onClick={() => setEditorTool('add_edge')}
            className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
              editorTool === 'add_edge'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Ligar Pontos (Corredor)"
          >
            <Link2 className="w-4 h-4" />
            <span className="text-[10px]">Corredor</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              Andar Selecionado:
            </span>
            <select
              value={activeFloorId}
              onChange={(e) => onFloorChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-medium text-xs focus:outline-none"
            >
              {buildingMap.floors.map(floor => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Planta Arquitetônica de Decalque (PNG/JPG):
            </label>
            <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-900/60 hover:bg-slate-900 transition-colors">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] text-slate-300">Carregar Imagem da Planta</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {editorTool === 'draw_unit' && (
          <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl space-y-2">
            <span className="font-bold text-blue-300 block">
              Desenhando Novo Restaurante / Sala
            </span>
            <p className="text-[11px] text-slate-400">
              Clique no mapa para marcar os cantos da loja.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-blue-400 text-xs">
                {draftPoints.length} pontos marcados
              </span>
              <div className="flex gap-2">
                <button
                  disabled={draftPoints.length === 0}
                  onClick={onClearDraftPoints}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 text-[11px]"
                >
                  Limpar
                </button>
                <button
                  disabled={draftPoints.length < 3}
                  onClick={() => setIsStoreModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 text-[11px]"
                >
                  Salvar Loja
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedUnit && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs">{selectedUnit.name}</h4>
              <button
                onClick={handleDeleteSelectedUnit}
                className="p-1 text-red-400 hover:bg-red-950/50 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-slate-400 text-[11px] space-y-0.5">
              <div><strong className="text-slate-300">Código:</strong> {selectedUnit.code || 'N/A'}</div>
              <div><strong className="text-slate-300">Andar:</strong> {buildingMap.floors.find(f => f.id === selectedUnit.floorId)?.name}</div>
              {selectedUnit.courierPickup && (
                <div className="text-amber-400 pt-1">
                  <strong>Retirada:</strong> {selectedUnit.courierPickup.windowName}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            Como criar rotas:
          </span>
          <p>1. Crie <strong>Pontos</strong> nos corredores por onde o entregador passa.</p>
          <p>2. Use a ferramenta <strong>Corredor</strong> para clicar no ponto A e depois no ponto B.</p>
          <p>3. O algoritmo <strong>Dijkstra</strong> calcula o menor caminho instantaneamente.</p>
        </div>
      </div>

      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
        <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer text-xs font-bold transition-colors">
          <Upload className="w-3.5 h-3.5" />
          <span>Importar</span>
          <input
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="hidden"
          />
        </label>

        <button
          onClick={handleExportJson}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>

      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-xs">
                Cadastrar Restaurante / Loja
              </h3>
              <button onClick={() => setIsStoreModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nome:</label>
                <input
                  type="text"
                  placeholder="Ex: Outback Steakhouse"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Número / Loja:</label>
                <input
                  type="text"
                  placeholder="Ex: Loja 261"
                  value={newStoreCode}
                  onChange={(e) => setNewStoreCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Balcão de Delivery (Motoboy):</label>
                <input
                  type="text"
                  placeholder="Ex: Balcão Lateral - Exclusivo Motoboy"
                  value={courierWindowName}
                  onChange={(e) => setCourierWindowName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveStore}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
