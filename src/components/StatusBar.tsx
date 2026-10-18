import React, { useState, useEffect } from 'react';
import { Wifi, Battery } from 'lucide-react';

interface StatusBarProps {
  dark?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ dark = false }) => {
  const [time, setTime] = useState<string>(() => 
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const textColor = dark ? 'text-white' : 'text-gray-900';

  return (
    <div 
      className={`simulated-status-bar flex items-center justify-between px-6 pt-3 pb-1 text-sm font-semibold ${textColor}`} 
      style={{ fontSize: 15 }}
    >
      <span>{time}</span>
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: 11, fontWeight: 600 }}>5G</span>
        <Wifi size={14} strokeWidth={2.5} />
        <Battery size={16} strokeWidth={2} />
      </div>
    </div>
  );
};
