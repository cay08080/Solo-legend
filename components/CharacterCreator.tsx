
import React, { useState } from 'react';
import { Character, CharacterClass, Rarity } from '../types.ts';
// Fixed: Changed generateCharacterPortrait to generateImage as it is the correct exported function
import { generateImage } from '../services/aiService.ts';

interface CharacterCreatorProps {
  onCreate: (char: Character) => void;
  onBack: () => void;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onCreate, onBack }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    race: '', 
    gender: '', 
    appearance: '', 
    backstory: '',
    blessingName: '',
    blessingDescription: ''
  });
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(CharacterClass.WARRIOR);
  const [attributes, setAttributes] = useState({ strength: 10, dexterity: 10, intelligence: 10, wisdom: 10 });
  const [points, setPoints] = useState(20);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const modifyAttr = (attr: keyof typeof attributes, val: number) => {
    if (val > 0 && points <= 0) return;
    if (val < 0 && attributes[attr] <= 8) return;
    setAttributes(prev => ({ ...prev, [attr]: prev[attr] + val }));
    setPoints(prev => prev - val);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.race) return;

    // Fix: Added missing manaCoins property to satisfy Character interface
    const newChar: Character = {
      ...formData,
      class: selectedClass,
      attributes,
      portraitUrl: previewImage || undefined,
      level: 1, 
      hp: 100 + attributes.strength * 5, 
      maxHp: 100 + attributes.strength * 5,
      mana: 50 + attributes.intelligence * 10, 
      maxMana: 50 + attributes.intelligence * 10,
      xp: 0, 
      manaCoins: 0,
      attributePoints: 0, 
      inventory: [],
      equipment: { weapon: null, armor: null, accessory: null },
      skills: [], 
      quests: [],
      proficiencies: []
    };
    onCreate(newChar);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-y-auto custom-scroll">
      <div className="bg-slate-900 border-2 border-amber-900/20 w-full max-w-6xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl my-8">
        
        <div className="flex-1 p-8 md:p-12 space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="font-cinzel text-amber-500 text-4xl">Gênesis</h1>
            <button onClick={onBack} className="text-slate-600 hover:text-white text-sm uppercase font-bold">Voltar</button>
          </div>

          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="font-cinzel text-amber-700 text-xs uppercase tracking-widest border-b border-amber-900/30 pb-1">Identidade do Herói</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Nome do Herói" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="bg-black/40 border border-slate-800 p-4 rounded-xl outline-none focus:border-amber-600 font-serif" 
                />
                <input 
                  type="text" 
                  placeholder="Raça (Ex: Elfo, Anão...)" 
                  value={formData.race} 
                  onChange={e => setFormData({...formData, race: e.target.value})}
                  className="bg-black/40 border border-slate-800 p-4 rounded-xl outline-none focus:border-amber-600" 
                />
              </div>
              <textarea 
                placeholder="Histórico: Conte-nos de onde você veio e qual o seu propósito..." 
                value={formData.backstory} 
                onChange={e => setFormData({...formData, backstory: e.target.value})}
                className="w-full bg-black/40 border border-slate-800 p-4 rounded-xl outline-none focus:border-amber-600 h-32 resize-none font-serif text-sm" 
              />
            </section>

            <section className="space-y-4">
              <h2 className="font-cinzel text-amber-700 text-xs uppercase tracking-widest border-b border-amber-900/30 pb-1">Benção & Poder (Opcional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                  type="text" 
                  placeholder="Nome da Benção (Ex: Centelha Solar)" 
                  value={formData.blessingName} 
                  onChange={e => setFormData({...formData, blessingName: e.target.value})}
                  className="bg-black/40 border border-slate-800 p-4 rounded-xl outline-none focus:border-amber-600 font-cinzel text-xs text-amber-500" 
                />
                <input 
                  type="text" 
                  placeholder="Essência do Poder (Ex: Eletricidade, Sombras)" 
                  value={formData.blessingDescription} 
                  className="md:col-span-2 bg-black/40 border border-slate-800 p-4 rounded-xl outline-none focus:border-amber-600 text-sm"
                  onChange={e => setFormData({...formData, blessingDescription: e.target.value})}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-cinzel text-amber-700 text-xs uppercase tracking-widest border-b border-amber-900/30 pb-1">Traços Físicos</h2>
              <textarea 
                placeholder="Descrição Física (Cabelo, olhos, cicatrizes, cor da pele...)" 
                value={formData.appearance} 
                onChange={e => setFormData({...formData, appearance: e.target.value})}
                className="w-full bg-black/40 border border-slate-800 p-4 rounded-xl outline-none focus:border-amber-600 h-20 resize-none text-sm" 
              />
            </section>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.values(CharacterClass).map(c => (
              <button 
                key={c} 
                onClick={() => setSelectedClass(c)}
                className={`py-3 rounded-xl border-2 font-cinzel text-[10px] transition-all ${selectedClass === c ? 'bg-amber-900/20 border-amber-500 text-white' : 'bg-black/20 border-slate-800 text-slate-600'}`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="bg-black/20 p-6 rounded-2xl border border-slate-800">
            <div className="flex justify-between mb-4">
              <span className="font-cinzel text-amber-700 text-xs">Pontos Místicos</span>
              <span className="text-white font-bold text-xs bg-amber-800 px-3 py-1 rounded-full">{points} Restantes</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(attributes).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                  <span className="capitalize text-slate-500 text-[10px] font-cinzel">{k}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => modifyAttr(k as any, -1)} className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-xs hover:bg-red-900 transition-colors">-</button>
                    <span className="w-4 text-center text-amber-500 font-bold text-sm">{v}</span>
                    <button onClick={() => modifyAttr(k as any, 1)} className="w-6 h-6 bg-amber-700 rounded flex items-center justify-center text-xs hover:bg-amber-500 transition-colors">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleCreate} 
            disabled={!formData.name || !formData.race || points > 0}
            className="w-full bg-amber-700 py-5 rounded-2xl font-cinzel font-bold text-xl hover:bg-amber-600 transition-all disabled:opacity-20 shadow-xl"
          >
            FORJAR MINHA LENDA
          </button>
        </div>

        <div className="w-full md:w-96 bg-black flex flex-col items-center justify-center p-10 relative border-l border-amber-900/20 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
          <div className="w-full aspect-[3/4] relative rounded-3xl overflow-hidden border-2 border-amber-900/40 shadow-[0_0_30px_rgba(180,83,9,0.2)] bg-slate-950 flex items-center justify-center">
            {previewImage ? (
              <img src={previewImage} className="w-full h-full object-cover animate-fade-in" alt="portrait" />
            ) : (
              <div className="text-slate-800 flex flex-col items-center gap-4 text-center">
                <span className="text-6xl filter grayscale opacity-20">👤</span>
                <span className="text-[10px] font-cinzel uppercase px-6 opacity-30 tracking-widest">Sua visão se manifestará aqui</span>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[8px] font-cinzel text-amber-500 animate-pulse">Invocando Retrato...</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={async () => {
              if (!formData.race || !formData.appearance) return;
              setIsGenerating(true);
              // Fixed: Changed generateCharacterPortrait to generateImage from aiService
              const url = await generateImage(`${formData.gender} ${formData.race} ${selectedClass}, physical: ${formData.appearance}, blessing: ${formData.blessingName || 'none'}`);
              if (url) setPreviewImage(url);
              setIsGenerating(false);
            }}
            disabled={isGenerating || !formData.race}
            className="mt-8 w-full bg-slate-900 px-6 py-4 rounded-xl border border-amber-500/30 text-amber-500 font-cinzel text-xs hover:border-amber-500 hover:bg-amber-900/10 transition-all disabled:opacity-30"
          >
            {isGenerating ? 'Revelando Face...' : 'VISUALIZAR HERÓI'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CharacterCreator;
