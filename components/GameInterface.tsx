
import React, { useState, useEffect, useRef } from 'react';
import { GameSave, ChatMessage, DMResponse, Item, Skill, Enemy, SkillForgeResponse } from '../types.ts';
import DiceRoller from './DiceRoller.tsx';
import { processTurn, generateImage, forgeSkillWithAI, speakNarrative } from '../services/aiService.ts';

interface GameInterfaceProps {
  save: GameSave;
  onUpdateSave: (updated: GameSave) => void;
  onBack: () => void;
}

const DM_AVATAR = "https://img.icons8.com/ios-filled/100/b45309/wizard.png";

const GameInterface: React.FC<GameInterfaceProps> = ({ save, onUpdateSave, onBack }) => {
  const { character, messages, gameState, world } = save;
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [showSkillForge, setShowSkillForge] = useState(false);
  const [skillConcept, setSkillConcept] = useState('');
  const [forgePreview, setForgePreview] = useState<SkillForgeResponse | null>(null);
  const [enemyShaking, setEnemyShaking] = useState(false);
  const [screenShaking, setScreenShaking] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Regeneração de Mana otimizada (apenas se necessário para evitar re-renders constantes)
  useEffect(() => {
    if (isProcessing) return;
    
    const timer = setInterval(() => {
      if (character.mana < character.maxMana) {
        const regenAmount = 1 + (character.attributes.intelligence / 20);
        const nextMana = Math.min(character.maxMana, character.mana + regenAmount);
        
        // Só atualiza se a mudança for significativa (evita lag visual)
        if (nextMana !== character.mana) {
          onUpdateSave({
            ...save,
            character: { ...character, mana: nextMana }
          });
        }
      }
    }, 3000);
    
    return () => clearInterval(timer);
  }, [character.mana, character.maxMana, isProcessing]);

  const handleAction = async (action: string, roll?: number) => {
    if (isProcessing || !action.trim()) return;
    setIsProcessing(true);
    
    const newUserMsg: ChatMessage = { 
      id: 'u-' + Date.now(), 
      sender: 'user', 
      content: roll ? `${action} (Resultado do Dado: ${roll})` : action,
      avatarUrl: character.portraitUrl 
    };
    
    const updatedMessages = [...messages, newUserMsg];
    onUpdateSave({ ...save, messages: updatedMessages });
    setInputText('');

    try {
      const history = updatedMessages.slice(-6).map(m => `${m.sender}: ${m.content}`);
      const res: DMResponse = await processTurn(action, character, world, history, gameState, roll);

      // Efeitos de combate
      if (res.hp_change < 0) {
        setScreenShaking(true);
        setTimeout(() => setScreenShaking(false), 500);
      }
      if (gameState.isCombat && res.enemy_update && res.enemy_update.currentHp < (gameState.currentEnemy?.currentHp || 0)) {
        setEnemyShaking(true);
        setTimeout(() => setEnemyShaking(false), 500);
      }

      const updatedChar = { ...character };
      updatedChar.hp = Math.max(0, Math.min(updatedChar.maxHp, updatedChar.hp + res.hp_change));
      updatedChar.mana = Math.max(0, Math.min(updatedChar.maxMana, updatedChar.mana + res.mp_change));
      updatedChar.xp += res.xp_change;
      updatedChar.manaCoins += res.mana_coin_change;

      // Evolução de Nível
      const xpNeeded = updatedChar.level * 150;
      if (updatedChar.xp >= xpNeeded) {
        updatedChar.level += 1;
        updatedChar.xp -= xpNeeded;
        updatedChar.maxHp += 30;
        updatedChar.maxMana += 20;
        updatedChar.hp = updatedChar.maxHp;
        updatedChar.mana = updatedChar.maxMana;
      }

      const dmMsg: ChatMessage = { 
        id: 'dm-' + Date.now(), 
        sender: 'dm' as const, 
        content: res.narrative,
        avatarUrl: DM_AVATAR
      };

      // Narração Inteligente
      if (!isMuted) {
        const speakerMatch = res.narrative.match(/^\[(.*?)\]:/);
        const speaker = speakerMatch ? speakerMatch[1] : 'DM';
        const cleanText = res.narrative.replace(/^\[.*?\]:/, '').trim();
        speakNarrative(cleanText, speaker);
      }

      const finalMessages = [...updatedMessages, dmMsg];
      
      let enemy = res.enemy_update;
      if (enemy && (!gameState.currentEnemy || enemy.name !== gameState.currentEnemy.name)) {
        const img = await generateImage(`RPG Monster, ${enemy.name}, ${enemy.description}, cinematic, highly detailed art.`);
        if (img) enemy.imageUrl = img;
      }

      onUpdateSave({
        ...save,
        character: updatedChar,
        messages: finalMessages,
        gameState: {
          ...gameState,
          isCombat: res.is_combat,
          currentEnemy: res.is_combat ? (enemy || gameState.currentEnemy) : null,
          locationName: res.location_update || gameState.locationName,
          worldContext: res.world_context_update
        }
      });

      setSuggestedActions(res.suggested_actions || []);
    } catch (e) {
      console.error("Erro no processamento do turno:", e);
      const errorMsg: ChatMessage = { id: 'err-'+Date.now(), sender: 'system', content: "O Mestre se distraiu com uma borboleta dimensional. Tente agir de novo." };
      onUpdateSave({ ...save, messages: [...updatedMessages, errorMsg] });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartForge = async () => {
    if (!skillConcept.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await forgeSkillWithAI(skillConcept, character);
      setForgePreview(res);
    } catch (e) { console.error(e); }
    finally { setIsProcessing(false); }
  };

  const confirmForge = () => {
    if (!forgePreview || character.manaCoins < forgePreview.mana_coin_cost) return;
    const updatedChar = { ...character };
    updatedChar.manaCoins -= forgePreview.mana_coin_cost;
    updatedChar.skills.push(forgePreview.skill);
    onUpdateSave({ ...save, character: updatedChar });
    setShowSkillForge(false);
    setForgePreview(null);
    setSkillConcept('');
    handleAction(`SISTEMA: Manifestação bem-sucedida! Habilidade '${forgePreview.skill.name}' adquirida.`);
  };

  return (
    <div className={`flex flex-col lg:flex-row h-screen bg-slate-950 text-slate-200 overflow-hidden transition-all duration-100 ${screenShaking ? 'animate-shake' : ''}`}>
      
      {/* BARRA DE STATUS LATERAL */}
      <aside className="w-full lg:w-80 bg-slate-900 border-r border-amber-900/30 p-8 flex flex-col gap-8 shadow-2xl z-20 overflow-y-auto custom-scroll">
        <div className="text-center relative group">
          <div className="w-48 h-48 rounded-[3rem] mx-auto border-4 border-amber-500 overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.3)] bg-black transition-transform group-hover:scale-105">
            <img src={character.portraitUrl} className="w-full h-full object-cover" alt="Hero portrait" />
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-600 text-black px-6 py-1.5 rounded-full font-bold text-sm uppercase tracking-widest shadow-2xl ring-4 ring-slate-900">
            Nível {character.level}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-red-500 font-bold uppercase tracking-widest">
              <span>Saúde</span>
              <span>{Math.floor(character.hp)}/{character.maxHp}</span>
            </div>
            <div className="h-5 bg-black rounded-full overflow-hidden border border-red-900/40 ring-1 ring-red-900/20 shadow-inner">
              <div className="h-full bg-gradient-to-r from-red-900 to-red-500 transition-all duration-700 shadow-[0_0_15px_rgba(220,38,38,0.5)]" style={{ width: `${(character.hp/character.maxHp)*100}%` }}></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-blue-400 font-bold uppercase tracking-widest">
              <span>Mana</span>
              <span>{Math.floor(character.mana)}/{character.maxMana}</span>
            </div>
            <div className="h-5 bg-black rounded-full overflow-hidden border border-blue-900/40 ring-1 ring-blue-900/20 shadow-inner">
              <div className="h-full bg-gradient-to-r from-blue-900 to-blue-500 transition-all duration-700 shadow-[0_0_20px_rgba(59,130,246,0.4)]" style={{ width: `${(character.mana/character.maxMana)*100}%` }}></div>
            </div>
          </div>

          <div className="bg-black/60 p-5 rounded-3xl border border-emerald-900/40 flex justify-between items-center group hover:border-emerald-500 transition-all shadow-xl">
            <span className="text-xs text-emerald-500 font-bold uppercase tracking-widest">ManaCoins</span>
            <span className="text-3xl font-bold text-emerald-400 flex items-center gap-3 group-hover:scale-110 transition-transform">{character.manaCoins} 🪙</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(character.attributes).map(([attr, val]) => (
            <div key={attr} className="bg-slate-950/80 border border-slate-800 p-4 rounded-3xl text-center shadow-inner hover:border-amber-900/50 transition-all group">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 group-hover:text-amber-700 transition-colors">{attr.slice(0,3)}</div>
              <div className="text-2xl font-bold text-amber-500 font-cinzel">{val}</div>
            </div>
          ))}
        </div>

        <DiceRoller onRoll={(v, s) => handleAction(`Lancei um D${s}`, v)} disabled={isProcessing} />
      </aside>

      {/* PAINEL CENTRAL DE NARRATIVA */}
      <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        <header className="p-6 bg-slate-900/95 border-b border-amber-900/30 flex justify-between items-center backdrop-blur-2xl z-10 shadow-2xl">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest border border-slate-800 px-4 py-2 rounded-xl">❮ Abandonar</button>
            <h2 className="font-cinzel text-amber-500 tracking-[0.3em] text-lg uppercase truncate max-w-[300px] drop-shadow-md">{gameState.locationName}</h2>
          </div>
          <div className="flex gap-5 items-center">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all ${isMuted ? 'border-red-900/50 text-red-500 bg-red-950/20' : 'border-amber-500/40 text-amber-500 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`}
              title={isMuted ? "Ligar Áudio" : "Mutar Áudio"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button onClick={() => setShowSkillForge(true)} className="px-6 py-3 bg-amber-700/20 border-2 border-amber-500/40 text-amber-500 rounded-2xl text-xs font-bold hover:bg-amber-600/30 transition-all uppercase shadow-2xl active:scale-95 tracking-widest">Altar de Forja</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 space-y-10 scrollbar-hide custom-scroll relative">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-6 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
              {m.sender !== 'system' && (
                <div className="w-14 h-14 rounded-[1.2rem] border-2 border-amber-900/40 overflow-hidden shadow-2xl flex-shrink-0 bg-slate-900 ring-4 ring-amber-900/5">
                   <img src={m.sender === 'user' ? character.portraitUrl : m.avatarUrl || DM_AVATAR} className="w-full h-full object-cover" alt="avatar" />
                </div>
              )}
              <div className={`max-w-[80%] p-8 rounded-[2.5rem] border-2 shadow-2xl relative transition-all ${
                m.sender === 'user' ? 'bg-slate-800/95 border-slate-700 rounded-tr-none' : 
                m.sender === 'system' ? 'bg-red-950/10 border-red-500/20 text-center mx-auto text-red-400 italic text-sm font-serif p-5 max-w-full w-full' :
                'bg-slate-900/98 border-amber-900/20 rounded-tl-none ring-1 ring-amber-500/5'
              }`}>
                <p className="font-serif text-2xl leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />

          {/* HUD DO INIMIGO */}
          {gameState.isCombat && gameState.currentEnemy && (
            <div className={`fixed top-32 right-16 w-80 bg-slate-900/98 border-4 border-red-900/40 rounded-[3.5rem] p-7 shadow-[0_40px_80px_rgba(0,0,0,0.8)] animate-slide-in backdrop-blur-3xl z-30 ring-2 ring-red-500/10 ${enemyShaking ? 'animate-shake' : ''}`}>
              <div className="relative group overflow-hidden rounded-[2.8rem] mb-6 border-2 border-red-900/30 shadow-2xl bg-black">
                {gameState.currentEnemy.imageUrl ? (
                  <img src={gameState.currentEnemy.imageUrl} className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-[4s]" alt="Enemy" />
                ) : (
                  <div className="w-full h-52 bg-black flex items-center justify-center text-8xl opacity-10">👹</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-5 left-6">
                  <h4 className="font-cinzel text-white text-2xl drop-shadow-2xl">{gameState.currentEnemy.name}</h4>
                  <div className="flex gap-3 items-center mt-1">
                    <span className="bg-red-700 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase animate-pulse shadow-lg">Ameaça</span>
                    <p className="text-xs text-red-400 font-bold uppercase tracking-widest">Lvl {gameState.currentEnemy.level}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-red-500 font-bold uppercase tracking-widest px-1">
                  <span>Vitalidade do Inimigo</span>
                  <span>{Math.floor(gameState.currentEnemy.currentHp)}/{gameState.currentEnemy.maxHp}</span>
                </div>
                <div className="h-5 bg-black rounded-full overflow-hidden border-2 border-red-900/50 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-red-950 via-red-800 to-red-600 transition-all duration-500 shadow-[0_0_25px_rgba(220,38,38,0.6)]" style={{ width: `${(gameState.currentEnemy.currentHp/gameState.currentEnemy.maxHp)*100}%` }}></div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="p-10 bg-slate-900/98 border-t border-slate-800/80 backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.6)]">
          <div className="flex gap-3 mb-6 overflow-x-auto pb-4 scrollbar-hide">
            {suggestedActions.map((s, i) => (
              <button key={i} onClick={() => handleAction(s)} className="whitespace-nowrap bg-black/60 border-2 border-amber-900/20 text-amber-700/90 px-7 py-3 rounded-full text-xs font-bold uppercase hover:border-amber-500 hover:text-amber-500 transition-all shadow-xl active:scale-95 tracking-tighter">{s}</button>
            ))}
          </div>
          <div className="flex gap-6">
            <input 
              type="text" 
              value={inputText} 
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAction(inputText)}
              className="flex-1 bg-black/60 border-2 border-slate-800 p-7 rounded-[2.5rem] outline-none focus:border-amber-600 font-serif text-2xl placeholder:text-slate-800 text-amber-50 transition-all shadow-inner ring-1 ring-amber-500/5" 
              placeholder={isProcessing ? "O destino está sendo escrito..." : "O que sua lenda fará a seguir?"}
              disabled={isProcessing}
            />
            <button onClick={() => handleAction(inputText)} disabled={isProcessing || !inputText.trim()} className="bg-amber-700 hover:bg-amber-600 px-16 rounded-[2.2rem] font-cinzel font-bold text-2xl transition-all shadow-2xl active:scale-95 disabled:opacity-20 group relative overflow-hidden">
              <span className="relative z-10 group-hover:tracking-[0.2em] transition-all">MANIFESTAR</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </div>
        </footer>
      </div>

      {/* MODAL ALTA DE FORJA */}
      {showSkillForge && (
        <div className="fixed inset-0 bg-black/98 z-[100] flex items-center justify-center p-10 backdrop-blur-3xl animate-fade-in">
          <div className="bg-slate-900 border-4 border-amber-900/40 w-full max-w-4xl rounded-[5rem] p-16 shadow-[0_0_120px_rgba(180,83,9,0.3)] space-y-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px]"></div>
            <button onClick={() => setShowSkillForge(false)} className="absolute top-12 right-16 text-5xl text-slate-700 hover:text-white transition-colors">✕</button>
            
            <div className="text-center space-y-4">
              <h2 className="font-cinzel text-amber-500 text-6xl tracking-widest drop-shadow-xl">Altar Primordial</h2>
              <p className="text-lg text-slate-500 font-serif italic max-w-xl mx-auto opacity-70">Manifeste novos poderes através do sacrifício de suas moedas espirituais.</p>
            </div>

            <div className="p-10 bg-black/60 border-2 border-emerald-900/40 rounded-[4rem] flex justify-between items-center shadow-2xl ring-2 ring-emerald-500/5">
              <div className="space-y-2">
                <p className="text-sm text-emerald-700 uppercase font-bold tracking-[0.4em]">Essência Acumulada</p>
                <p className="text-6xl font-bold text-emerald-400">{character.manaCoins} 🪙</p>
              </div>
              <div className="text-right space-y-2">
                <p className="text-sm text-amber-800 uppercase font-bold tracking-[0.4em]">Sua Origem</p>
                <p className="text-2xl text-amber-500 font-cinzel tracking-wider">{character.blessingName}</p>
              </div>
            </div>

            {!forgePreview ? (
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-xs text-slate-600 uppercase font-bold tracking-[0.3em] block ml-6">Descreva a nova manifestação do seu poder</label>
                  <textarea 
                    value={skillConcept}
                    onChange={e => setSkillConcept(e.target.value)}
                    className="w-full bg-black/70 border-2 border-slate-800 p-10 rounded-[3rem] outline-none focus:border-amber-600 h-56 resize-none font-serif text-3xl text-amber-100 placeholder:text-slate-900 shadow-inner ring-1 ring-amber-500/5 transition-all"
                    placeholder="Ex: Criar uma explosão de chamas ao redor de mim..."
                  />
                </div>
                <button 
                  onClick={handleStartForge}
                  disabled={isProcessing || !skillConcept.trim()}
                  className="w-full bg-amber-700 py-7 rounded-[2.5rem] font-cinzel font-bold text-3xl hover:bg-amber-600 transition-all disabled:opacity-20 shadow-2xl active:scale-95"
                >
                  {isProcessing ? 'INVOCANDO AS ESTRELAS...' : 'INICIAR MANIFESTAÇÃO'}
                </button>
              </div>
            ) : (
              <div className="space-y-12 animate-fade-in">
                <div className={`p-12 rounded-[4rem] border-4 shadow-2xl ${forgePreview.is_approved ? 'bg-slate-950/90 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                  {forgePreview.is_approved ? (
                    <div className="space-y-8">
                      <div className="flex justify-between items-center">
                        <h3 className="text-4xl font-cinzel text-amber-500 tracking-tighter">{forgePreview.skill.name}</h3>
                        <span className="bg-emerald-950/50 text-emerald-500 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-500/30">{forgePreview.skill.effect_type}</span>
                      </div>
                      <p className="text-3xl text-slate-400 font-serif italic leading-relaxed">"{forgePreview.skill.description}"</p>
                      <div className="grid grid-cols-2 gap-12 pt-12 border-t border-slate-800/80">
                        <div className="space-y-2">
                          <p className="text-xs text-slate-600 uppercase font-bold tracking-[0.3em]">Custo de Energia</p>
                          <p className="text-5xl font-bold text-blue-400">{forgePreview.skill.cost} MP</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-slate-600 uppercase font-bold tracking-[0.3em]">Preço Espiritual</p>
                          <p className="text-5xl font-bold text-emerald-400">{forgePreview.mana_coin_cost} 🪙</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-10 space-y-8">
                      <p className="text-red-500 font-bold text-5xl uppercase tracking-tighter drop-shadow-lg">FORJA RECUSADA</p>
                      <p className="text-2xl text-slate-500 italic font-serif leading-relaxed max-w-lg mx-auto">"{forgePreview.refusal_reason}"</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-10">
                  <button onClick={() => setForgePreview(null)} className="flex-1 py-6 text-slate-500 font-bold uppercase text-sm hover:text-white transition-colors tracking-[0.3em]">Recuar</button>
                  {forgePreview.is_approved && (
                    <button 
                      onClick={confirmForge}
                      disabled={character.manaCoins < forgePreview.mana_coin_cost}
                      className="flex-[2] bg-emerald-700 py-6 rounded-[2rem] font-cinzel font-bold text-white text-2xl hover:bg-emerald-600 transition-all disabled:opacity-20 shadow-[0_0_50px_rgba(5,150,105,0.5)]"
                    >
                      {character.manaCoins < forgePreview.mana_coin_cost ? 'ESSÊNCIA INSUFICIENTE' : 'CONCLUIR PACTO'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px) rotate(-1deg); }
          75% { transform: translateX(10px) rotate(1deg); }
        }
        .animate-shake { animation: shake 0.12s infinite; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default GameInterface;
