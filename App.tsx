
import React, { useState, useEffect, useCallback } from 'react';
import CharacterCreator from './components/CharacterCreator.tsx';
import GameInterface from './components/GameInterface.tsx';
import WorldSelector from './components/WorldSelector.tsx';
import { Character, GameSave, World, DMResponse } from './types.ts';
import { startAdventure } from './services/aiService.ts';

const STORAGE_KEY = 'lenda_solo_v11_final';
const DM_AVATAR = "https://img.icons8.com/ios-filled/100/b45309/wizard.png";

// Interface for AI Studio environment
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    // Making this optional to match potential pre-existing declarations in the environment
    aistudio?: AIStudio;
  }
}

function App() {
  const [saves, setSaves] = useState<GameSave[]>(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  });
  
  const [currentSave, setCurrentSave] = useState<GameSave | null>(null);
  const [activeWorld, setActiveWorld] = useState<World | null>(null);
  const [screen, setScreen] = useState<'HUB' | 'CREATOR' | 'GAME' | 'LOADING'>('HUB');
  const [loadingText, setLoadingText] = useState("Iniciando...");
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  }, [saves]);

  const updateGlobalSaves = useCallback((save: GameSave) => {
    setSaves(prev => {
      const index = prev.findIndex(s => s.id === save.id);
      if (index === -1) return [save, ...prev];
      const newSaves = [...prev];
      newSaves[index] = { ...save, lastPlayed: Date.now() };
      return newSaves;
    });
  }, []);

  const handleCharacterCreated = async (char: Character) => {
    if (!activeWorld) return;
    
    setScreen('LOADING');
    setLoadingText(`Conjurando ${activeWorld.name}...`);

    const initializeWithFallback = () => {
      const fallbackSave: GameSave = {
        id: 'save-fb-' + Date.now(),
        world: activeWorld!,
        character: { ...char, manaCoins: 100 },
        messages: [{ 
          id: 'msg-fb', 
          sender: 'dm', 
          content: `Seus olhos se abrem em ${activeWorld!.name}. O ar vibra com o tema de ${activeWorld!.theme}. O destino te chamou, mas o Mestre está em silêncio... por enquanto.`,
          avatarUrl: DM_AVATAR
        }],
        gameState: {
          locationName: 'Portal das Sombras',
          isCombat: false,
          currentEnemy: null,
          lastTurnSummary: 'Chegada Silenciosa',
          worldContext: 'Conexão mística enfraquecida.'
        },
        lastPlayed: Date.now()
      };
      setCurrentSave(fallbackSave);
      updateGlobalSaves(fallbackSave);
      setScreen('GAME');
    };

    try {
      // Verifica chave primeiro
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      const initialChar = { ...char, manaCoins: 150 }; // Bonus por resiliência
      
      // Timeout agressivo de 12 segundos para o prólogo
      const adventurePromise = startAdventure(initialChar, activeWorld);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 12000)
      );
      
      const res = await (Promise.race([adventurePromise, timeoutPromise]) as Promise<DMResponse>);
      
      const newSave: GameSave = {
        id: 'save-' + Date.now(),
        world: activeWorld,
        character: initialChar,
        messages: [{ 
          id: 'msg-' + Date.now(), 
          sender: 'dm', 
          content: res.narrative,
          avatarUrl: DM_AVATAR
        }],
        gameState: {
          locationName: res.location_update || 'Início da Jornada',
          isCombat: res.is_combat,
          currentEnemy: res.enemy_update || null,
          lastTurnSummary: 'Chegada',
          worldContext: res.world_context_update
        },
        lastPlayed: Date.now()
      };

      setCurrentSave(newSave);
      updateGlobalSaves(newSave);
      setScreen('GAME');
    } catch (e) {
      console.error("Erro de Lançamento:", e);
      initializeWithFallback();
    }
  };

  if (screen === 'HUB') return <WorldSelector saves={saves} onSelectSave={s => { setCurrentSave(s); setScreen('GAME'); }} onCreateNew={w => { setActiveWorld(w); setScreen('CREATOR'); }} onDeleteSave={id => setSaves(prev => prev.filter(s => s.id !== id))} />;
  if (screen === 'CREATOR') return <CharacterCreator onCreate={handleCharacterCreated} onBack={() => setScreen('HUB')} />;
  
  if (screen === 'LOADING') return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-amber-500 font-cinzel p-10 text-center">
      <div className="relative mb-16">
        <div className="w-40 h-40 border-8 border-amber-900/30 border-t-amber-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-6xl animate-pulse">🌌</div>
      </div>
      <h2 className="text-5xl tracking-[0.3em] mb-6 uppercase">Manifestando</h2>
      <p className="text-slate-500 italic max-w-lg animate-pulse text-xl mb-12">
        {loadingText}
      </p>
      
      <div className="flex flex-col gap-4">
        <button 
          onClick={() => window.location.reload()} 
          className="px-8 py-3 bg-amber-900/20 border border-amber-500/50 text-amber-500 rounded-xl text-xs font-bold hover:bg-amber-500 hover:text-black transition-all"
        >
          🔄 Reiniciar Destino
        </button>
        <button 
          onClick={async () => { if(window.aistudio) await window.aistudio.openSelectKey(); }} 
          className="text-slate-600 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
        >
          Trocar Chave de API
        </button>
      </div>
    </div>
  );

  if (currentSave && screen === 'GAME') return <GameInterface save={currentSave} onUpdateSave={s => { setCurrentSave(s); updateGlobalSaves(s); }} onBack={() => setScreen('HUB')} />;

  return null;
}

export default App;
