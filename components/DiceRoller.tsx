import React, { useState } from 'react';

interface DiceRollerProps {
  onRoll: (value: number, type: number) => void;
  disabled: boolean;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ onRoll, disabled }) => {
  const [rolling, setRolling] = useState<number | null>(null);

  const rollDie = (sides: number) => {
    if (disabled) return;
    setRolling(sides);
    
    // Simple animation delay
    setTimeout(() => {
      const result = Math.floor(Math.random() * sides) + 1;
      onRoll(result, sides);
      setRolling(null);
    }, 600);
  };

  const diceTypes = [4, 6, 8, 10, 12, 20];

  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
      <h3 className="text-amber-500 font-cinzel mb-3 text-sm uppercase tracking-wider">Dados do Destino</h3>
      <div className="grid grid-cols-3 gap-2">
        {diceTypes.map((sides) => (
          <button
            key={sides}
            onClick={() => rollDie(sides)}
            disabled={disabled || rolling !== null}
            className={`
              relative h-12 flex items-center justify-center rounded 
              font-bold text-slate-900 transition-all transform hover:scale-105 active:scale-95
              ${rolling === sides ? 'animate-bounce bg-amber-300' : 'bg-slate-300 hover:bg-amber-400'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className="z-10">D{sides}</span>
            {/* Simple CSS shape implication */}
            <div className="absolute inset-0 border-b-4 border-r-4 border-black/20 rounded"></div>
          </button>
        ))}
      </div>
      {rolling && (
        <div className="mt-2 text-center text-xs text-amber-300 animate-pulse">
          Rolando...
        </div>
      )}
    </div>
  );
};

export default DiceRoller;