
import React, { useState } from 'react';
import { World, GameSave } from '../types.ts';

interface WorldSelectorProps {
  saves: GameSave[];
  onSelectSave: (save: GameSave) => void;
  onCreateNew: (world: World) => void;
  onDeleteSave: (id: string) => void;
}

const PRESET_WORLDS: World[] = [
  {
    id: 'fantasy-classic',
    name: 'Eldoria: O Reino Esquecido',
    theme: 'Alta Fantasia Medieval',
    description: 'Um reino de castelos flutuantes onde heróis nascem em tabernas e a magia corre pelas veias da terra.',
    createdAt: Date.now()
  },
  {
    id: 'cyber-neo',
    name: 'Neo-Saka 2099',
    theme: 'Cyberpunk Distópico',
    description: 'Megacorporações governam do topo das torres neon enquanto mercenários sobrevivem com implantes no asfalto molhado.',
    createdAt: Date.now()
  },
  {
    id: 'eldritch-fog',
    name: 'Yharnam: O Nevoeiro',
    theme: 'Horror Gótico e Cósmico',
    description: 'A lua de sangue vigia uma cidade amaldiçoada. O conhecimento traz a loucura e monstros espreitam no nevoeiro eterno.',
    createdAt: Date.now()
  }
];

const WorldSelector: React.FC<WorldSelectorProps> = ({ saves, onSelectSave, onCreateNew, onDeleteSave }) => {
  const [showCreator, setShowCreator] = useState(false);
  const [newWorld, setNewWorld] = useState({ name: '', theme: '', description: '' });

  const handleCreateCustom = () => {
    if (!newWorld.name || !newWorld.theme) return;
    onCreateNew({
      id: 'custom-' + Date.now(),
      ...newWorld,
      createdAt: Date.now()
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 font-cinzel overflow-y-auto">
      <div className="max-w-6xl w-full space-y-16 py-12">
        <header className="text-center space-y-5">
          <h1 className="text-8xl text-amber-500 drop-shadow-[0_0_40px_rgba(245,158,11,0.2)] tracking-tighter">MULTIVERSO</h1>
          <p className="text-slate-500 uppercase tracking-[0.7em] text-[10px] font-bold opacity-60">Escolha sua realidade ou forje o impossível</p>
        </header>

        {/* JOGOS SALVOS */}
        {saves.length > 0 && (
          <section className="space-y-8 animate-fade-in">
            <h2 className="text-3xl text-amber-600 border-b border-amber-900/20 pb-4 flex items-center gap-4">
               Jornadas Ativas <span className="h-[2px] flex-1 bg-gradient-to-r from-amber-900/30 to-transparent"></span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {saves.map(save => (
                <div key={save.id} className="group relative bg-slate-900 border-2 border-slate-800/50 rounded-[3rem] p-8 hover:border-amber-500 transition-all flex flex-col gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl text-white group-hover:text-amber-500 transition-colors">{save.character.name}</h3>
                      <p className="text-[10px] text-amber-900 uppercase font-bold tracking-widest">{save.world.name}</p>
                    </div>
                    <span className="bg-amber-900/30 text-amber-500 px-3 py-1 rounded-full text-[10px] font-bold ring-1 ring-amber-500/20">LVL {save.character.level}</span>
                  </div>
                  <p className="text-sm text-slate-500 font-serif italic line-clamp-2">"{save.gameState.locationName}"</p>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => onSelectSave(save)} className="flex-[3] bg-amber-600 hover:bg-amber-500 text-black font-bold py-3.5 rounded-2xl text-xs transition-all uppercase shadow-lg active:scale-95">Continuar Saga</button>
                    <button onClick={() => onDeleteSave(save.id)} className="flex-1 bg-slate-800 hover:bg-red-900 p-3.5 rounded-2xl text-xs text-slate-500 hover:text-white transition-all shadow-lg active:scale-95">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NOVOS MUNDOS */}
        {!showCreator ? (
          <section className="space-y-8">
            <h2 className="text-3xl text-amber-600 border-b border-amber-900/20 pb-4 flex items-center gap-4">
               Novas Sagas <span className="h-[2px] flex-1 bg-gradient-to-r from-amber-900/30 to-transparent"></span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PRESET_WORLDS.map(world => (
                <button 
                  key={world.id} 
                  onClick={() => onCreateNew(world)}
                  className="bg-slate-900/40 border-2 border-slate-800/30 p-10 rounded-[3.5rem] hover:border-amber-500 hover:bg-slate-800/60 transition-all text-left space-y-6 group shadow-xl hover:-translate-y-2"
                >
                  <div className="text-5xl group-hover:scale-125 transition-transform duration-500 origin-left">🌍</div>
                  <div>
                    <h3 className="text-2xl text-amber-500 mb-1">{world.name}</h3>
                    <span className="block text-[10px] text-amber-900 font-bold uppercase tracking-[0.2em]">{world.theme}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-serif leading-relaxed line-clamp-3 opacity-80">{world.description}</p>
                </button>
              ))}
              <button 
                onClick={() => setShowCreator(true)}
                className="bg-amber-900/5 border-2 border-dashed border-amber-900/20 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 hover:bg-amber-900/10 hover:border-amber-500/50 transition-all text-amber-700 group py-16 shadow-inner"
              >
                <span className="text-6xl group-hover:rotate-180 transition-transform duration-700">+</span>
                <span className="font-bold uppercase tracking-[0.4em] text-[10px]">Forjar Realidade</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="max-w-3xl mx-auto bg-slate-900 border-2 border-amber-600/50 p-16 rounded-[4rem] space-y-10 animate-fade-in shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            <div className="text-center space-y-3">
              <h2 className="text-5xl text-amber-500 tracking-widest">Gênesis</h2>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-[0.3em]">Crie as leis fundamentais do seu mundo</p>
            </div>
            <div className="space-y-6 font-sans">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-amber-800 tracking-widest block ml-4">Nome da Dimensão</label>
                <input type="text" value={newWorld.name} onChange={e => setNewWorld({...newWorld, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800/80 p-5 rounded-[2rem] text-white outline-none focus:border-amber-500 transition-all text-lg" placeholder="Ex: Terra 616, Reino de Cinzas..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-amber-800 tracking-widest block ml-4">Atmosfera (Gênero)</label>
                <input type="text" value={newWorld.theme} onChange={e => setNewWorld({...newWorld, theme: e.target.value})} className="w-full bg-slate-950 border border-slate-800/80 p-5 rounded-[2rem] text-white outline-none focus:border-amber-500 transition-all text-lg" placeholder="Ex: Steampunk vitoriano, Horror Espacial..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-amber-800 tracking-widest block ml-4">Lore Primordial</label>
                <textarea value={newWorld.description} onChange={e => setNewWorld({...newWorld, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800/80 p-6 rounded-[2.5rem] text-white outline-none focus:border-amber-500 h-40 resize-none transition-all text-base" placeholder="Quais são as forças que regem este lugar?" />
              </div>
            </div>
            <div className="flex gap-6 pt-4">
              <button onClick={() => setShowCreator(false)} className="flex-1 bg-slate-800/50 text-white font-bold py-5 rounded-[2rem] hover:bg-slate-700 transition-all uppercase text-xs tracking-widest">Abortar</button>
              <button onClick={handleCreateCustom} className="flex-1 bg-amber-600 text-black font-bold py-5 rounded-[2rem] hover:bg-amber-500 transition-all uppercase text-xs tracking-widest shadow-2xl active:scale-95">Consumar Realidade</button>
            </div>
          </section>
        )}
      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default WorldSelector;
