import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { Restaurant } from '../data/restaurants';
import { BuildingMap } from '../types/map';
import { calculateIndoorRoute } from '../utils/pathfinding';

interface Screen5StepsProps {
  restaurant: Restaurant;
  buildingMap: BuildingMap;
  entranceId?: string;
  onBack: () => void;
  onArrived: () => void;
}

const StepPhoto = ({ type, description }: { type: string; description: string }) => {
  const configs: Record<string, { gradient: string; icon: string }> = {
    elevator: {
      gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
      icon: '🛗',
    },
    escalator: {
      gradient: 'linear-gradient(135deg, #1e3a2a, #16a34a)',
      icon: '🔼',
    },
    stairs: {
      gradient: 'linear-gradient(135deg, #3a1e1e, #dc2626)',
      icon: '🪜',
    },
    destination: {
      gradient: 'linear-gradient(135deg, #3a2a1e, #d97706)',
      icon: '🍽️',
    },
    default: {
      gradient: 'linear-gradient(135deg, #1e2a3a, #475569)',
      icon: '🏬',
    },
  };

  const config = configs[type] || configs.default;

  return (
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-inner"
      style={{ height: 160, background: config.gradient }}
    >
      <div className="text-4xl mb-1">{config.icon}</div>
      <div className="px-4 text-center">
        <p className="text-white/90 text-xs font-semibold">{description}</p>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>
    </div>
  );
};

const StepIcon = ({ iconType }: { iconType: string }) => {
  const icons: Record<string, { emoji: string; bg: string }> = {
    start: { emoji: '📍', bg: '#dcfce7' },
    walk: { emoji: '🚶', bg: '#dbeafe' },
    elevator: { emoji: '🛗', bg: '#ede9fe' },
    escalator: { emoji: '↗️', bg: '#d1fae5' },
    stairs: { emoji: '🪜', bg: '#fee2e2' },
    destination: { emoji: '🎯', bg: '#fef9c3' },
  };

  const config = icons[iconType] || icons.walk;

  return (
    <div
      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
      style={{ backgroundColor: config.bg }}
    >
      {config.emoji}
    </div>
  );
};

export const Screen5Steps: React.FC<Screen5StepsProps> = ({
  restaurant,
  buildingMap,
  entranceId = 'node-ent-feira',
  onBack,
  onArrived,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Calcula rota dinâmica
  const targetNode = buildingMap.nodes.find(n => 
    n.label?.toLowerCase().includes(restaurant.name.toLowerCase()) ||
    n.id.toLowerCase().includes(restaurant.id.toLowerCase())
  ) || buildingMap.nodes.find(n => n.id === 'node-door-outback-bangu') || buildingMap.nodes[0];

  const routeResult = calculateIndoorRoute(
    buildingMap,
    entranceId,
    targetNode.id,
    'courier'
  );

  // Usa instruções geradas pelo algoritmo Dijkstra se disponível, com fallback para o dataset estático
  const steps = routeResult && routeResult.instructions.length > 0
    ? routeResult.instructions.map((inst, idx) => ({
        id: inst.id,
        step: idx + 1,
        totalSteps: routeResult.instructions.length,
        title: inst.title,
        description: inst.description,
        icon: inst.iconType,
        hasPhoto: inst.iconType === 'elevator' || inst.iconType === 'escalator' || idx === 1,
        photoDescription: inst.photoDescription || (inst.iconType === 'elevator' ? 'Elevador de Serviço 2 – Próx. Entrada B' : 'Corredor do Setor Oeste'),
        connectorType: inst.iconType === 'elevator' ? 'elevator' : inst.iconType === 'escalator' ? 'escalator' : undefined
      }))
    : restaurant.routeSteps;

  const step = steps[currentStep] || steps[0];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onArrived();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white">
        <StatusBar />
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ChevronLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xs text-blue-600 font-semibold">Rota até {restaurant.name}</p>
            <p className="text-gray-400 text-xs">
              {routeResult ? `${routeResult.estimatedMinutes} min • ${routeResult.totalDistanceMeters}m` : `${Math.ceil(restaurant.distance / 80)} min • ${restaurant.distance}m`}
            </p>
          </div>
          <div className="w-8" />
        </div>

        {/* Contador de Passos */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-black text-gray-900 text-base">{step.step} de {step.totalSteps}</h2>
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className="rounded-full transition-all"
                style={{
                  width: idx === currentStep ? 20 : 6,
                  height: 6,
                  backgroundColor: idx === currentStep ? '#2563eb' : idx < currentStep ? '#93c5fd' : '#e2e8f0',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo do Passo */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {step.hasPhoto && (
          <div className="mb-4">
            <StepPhoto
              type={step.connectorType || step.icon}
              description={step.photoDescription || ''}
            />
          </div>
        )}

        {/* Card da Instrução */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-start gap-3">
            <StepIcon iconType={step.connectorType || step.icon} />
            <div className="flex-1">
              <p className="font-black text-gray-900 text-base leading-tight">{step.title}</p>
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">{step.description}</p>

              {step.connectorType === 'elevator' && (
                <div className="mt-3 bg-purple-50 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-2xl">🛗</span>
                  <div>
                    <p className="text-purple-800 text-xs font-bold">Elevador de serviço liberado</p>
                    <p className="text-purple-600 text-xs">Acesso rápido exclusivo para entregadores</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista resumida */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          {steps.map((s, idx) => (
            <div
              key={s.id || idx}
              className={`flex items-center gap-3 px-4 py-3 ${idx < steps.length - 1 ? 'border-b border-gray-50' : ''}`}
              style={{
                background: idx === currentStep ? '#eff6ff' : idx < currentStep ? '#f8fafc' : 'white',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  backgroundColor: idx === currentStep ? '#2563eb' : idx < currentStep ? '#10b981' : '#e2e8f0',
                  color: idx <= currentStep ? 'white' : '#9ca3af',
                }}
              >
                {idx < currentStep ? '✓' : idx + 1}
              </div>
              <p
                className="text-sm flex-1 truncate"
                style={{
                  color: idx === currentStep ? '#1d4ed8' : idx < currentStep ? '#6b7280' : '#374151',
                  fontWeight: idx === currentStep ? 700 : 400,
                }}
              >
                {s.title}
              </p>
              {idx === currentStep && (
                <ArrowRight size={14} className="text-blue-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="bg-white border-t border-gray-100 p-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-sm disabled:opacity-30 hover:border-gray-300 transition-colors"
          >
            <ChevronLeft size={18} />
            Anterior
          </button>
          <button
            onClick={handleNext}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all ${
              isLast
                ? 'bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/25'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25'
            }`}
          >
            {isLast ? 'Cheguei!' : 'Próximo'}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
