
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Character, DMResponse, World, SkillForgeResponse } from "../types.ts";

// Modelos Flash para máxima estabilidade e menor latência
const TEXT_MODEL = "gemini-3-flash-preview"; 
const IMAGE_MODEL = "gemini-2.5-flash-image";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

// Cria a instância no momento do uso para capturar a chave de API mais recente seguindo as diretrizes
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

/**
 * REPARADOR DE JSON (Nível 4)
 * Extrai JSON de blocos markdown e lida com caracteres ilegais.
 */
const repairAndParse = (text: string): DMResponse => {
  try {
    let cleanText = text.trim();
    
    // Remove tags de código markdown se presentes
    const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (mdMatch) cleanText = mdMatch[1];

    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    
    if (start === -1 || end === -1) throw new Error("Estrutura JSON não encontrada.");
    
    const jsonStr = cleanText.substring(start, end + 1);
    const parsed = JSON.parse(jsonStr);

    return {
      narrative: parsed.narrative || "A névoa se dissipa...",
      visual_description: parsed.visual_description || "Um local misterioso.",
      hp_change: Number(parsed.hp_change) || 0,
      mp_change: Number(parsed.mp_change) || 0,
      xp_change: Number(parsed.xp_change) || 0,
      mana_coin_change: Number(parsed.mana_coin_change) || 0,
      inventory_add: Array.isArray(parsed.inventory_add) ? parsed.inventory_add : [],
      inventory_remove: Array.isArray(parsed.inventory_remove) ? parsed.inventory_remove : [],
      location_update: parsed.location_update || null,
      is_combat: !!parsed.is_combat,
      enemy_update: parsed.enemy_update || null,
      suggested_actions: Array.isArray(parsed.suggested_actions) ? parsed.suggested_actions : ["Observar", "Continuar"],
      world_context_update: parsed.world_context_update || "Seguindo jornada."
    };
  } catch (e) {
    console.error("Erro crítico no parser de IA:", e);
    throw e;
  }
};

const handleAIError = async (e: any) => {
  const errorMsg = e?.message || "";
  // Se a chave for inválida ou não suportada
  if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("API key not valid")) {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
  }
  throw e;
};

const getSystemInstruction = (world: World, character: Character) => `
Você é o Mestre Supremo de RPG. Responda APENAS em JSON.
MUNDO: ${world.name} (${world.theme})
PERSONAGEM: ${character.name} (${character.race} ${character.class}).
Regras de Ouro:
1. Nunca saia do JSON.
2. Seja sombrio, heróico e detalhista.
3. Se houver combate, 'is_combat' deve ser true.
`;

export const startAdventure = async (character: Character, world: World): Promise<DMResponse> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `INÍCIO: O herói ${character.name} chega em ${world.name}. Narre o início da aventura e dê 3 opções.`,
      config: {
        systemInstruction: getSystemInstruction(world, character),
        responseMimeType: "application/json"
      }
    });
    return repairAndParse(response.text || "");
  } catch (e) {
    return handleAIError(e);
  }
};

export const processTurn = async (
  action: string, 
  character: Character, 
  world: World, 
  history: string[], 
  gameState: any, 
  rollResult?: number
): Promise<DMResponse> => {
  try {
    const ai = getAI();
    const prompt = `AÇÃO: ${action} | DADO: ${rollResult || 'n/a'}. HP: ${character.hp}, MP: ${character.mana}. LOCAL: ${gameState.locationName}.`;
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(world, character),
        responseMimeType: "application/json"
      }
    });
    return repairAndParse(response.text || "");
  } catch (e) {
    return handleAIError(e);
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: `Digital RPG art style: ${prompt}` }] },
    });
    // Iterate through parts to find the image part as per guidelines
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch { return null; }
};

export const speakNarrative = async (text: string, speaker: string = 'DM'): Promise<void> => {
  try {
    const ai = getAI();
    let voiceName = 'Kore'; 
    if (speaker !== 'DM') {
      const voices = ['Puck', 'Charon', 'Zephyr', 'Fenrir'];
      voiceName = voices[Math.abs(speaker.length) % voices.length];
    }
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: `${speaker} diz: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioCtx);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch { /* Ignora erro de áudio */ }
};

export const forgeSkillWithAI = async (concept: string, character: Character): Promise<SkillForgeResponse> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `FORJA: O personagem da classe ${character.class} deseja manifestar o seguinte conceito de habilidade: ${concept}. Analise se é apropriado e retorne os dados da habilidade.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skill: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                cost: { type: Type.NUMBER },
                effect_type: { type: Type.STRING },
                cooldown: { type: Type.NUMBER },
                flavor_text: { type: Type.STRING }
              },
              required: ["name", "description", "cost", "effect_type", "cooldown"]
            },
            mana_coin_cost: { type: Type.NUMBER },
            is_approved: { type: Type.BOOLEAN },
            refusal_reason: { type: Type.STRING }
          },
          required: ["skill", "mana_coin_cost", "is_approved"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return handleAIError(e);
  }
};
