import React from 'react';
import { ChevronLeft, Globe } from 'lucide-react';

interface AppHeaderProps {
  onBack?: () => void;
  title?: string;
  mallName?: string;
  showLang?: boolean;
  transparent?: boolean;
  dark?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onBack,
  title,
  mallName = 'Bangu Shopping',
  showLang = false,
  transparent = false,
  dark = false,
}) => {
  const bg = transparent ? 'bg-transparent' : dark ? 'bg-gray-900' : 'bg-white';
  const textColor = dark ? 'text-white' : 'text-gray-900';
  const borderColor = dark ? 'border-gray-700' : 'border-gray-100';

  return (
    <div className={`${bg} ${!transparent ? `border-b ${borderColor}` : ''} flex items-center px-4 py-3 gap-3`}>
      {onBack ? (
        <button
          onClick={onBack}
          className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors ${textColor}`}
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          {/* Logo Bangu Shopping */}
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-black">BS</span>
          </div>
          <span className={`font-bold text-base ${textColor}`}>{mallName}</span>
        </div>
      )}

      {title && (
        <span className={`flex-1 text-center font-semibold text-base ${textColor} ${onBack ? 'mr-8' : ''}`}>
          {title}
        </span>
      )}

      {showLang && (
        <button className="flex items-center gap-1 text-emerald-600 text-sm font-semibold ml-auto">
          <Globe size={15} />
          <span>PT</span>
        </button>
      )}

      {!showLang && !title && <div className="ml-auto" />}
    </div>
  );
};
