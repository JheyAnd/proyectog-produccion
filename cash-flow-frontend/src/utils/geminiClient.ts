/**
 * Gemini client utilities — replaces Groq logic.
 * Uses Google Generative AI REST API directly to avoid package installation issues.
 */

export const LS_KEY       = 'pcm_gemini_key';
export const LS_MODEL_KEY = 'pcm_gemini_model';
export const DEFAULT_MODEL = 'gemini-1.5-flash';

/** Modelos compatibles con el nivel gratuito de Gemini. */
export const FREE_TIER_MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];

/** Evento global que se dispara cuando la API key cambia (save/clear). */
export const GEMINI_KEY_EVENT = 'pcm:gemini-key-changed';

export function getGeminiKey(): string | null {
  const k = localStorage.getItem(LS_KEY);
  return k && k.trim().length > 0 ? k : null;
}

export function getGeminiModel(): string {
  const stored = localStorage.getItem(LS_MODEL_KEY);
  // Si el modelo guardado no está en la lista segura, forzar el modelo por defecto
  if (!stored || !FREE_TIER_MODELS.includes(stored)) {
    localStorage.setItem(LS_MODEL_KEY, DEFAULT_MODEL);
    return DEFAULT_MODEL;
  }
  return stored;
}

/** Notifica al resto de la app que la key cambió. */
export function emitGeminiKeyChanged(): void {
  window.dispatchEvent(new Event(GEMINI_KEY_EVENT));
}

export type ChatRole = 'system' | 'user' | 'model'; // Gemini usa 'model' en vez de 'assistant'
export interface ChatMsg {
  role: ChatRole;
  parts: { text: string }[];
}

export interface GeminiStreamOptions {
  history: ChatMsg[];
  prompt: string;
  systemInstruction?: string;
  model?: string;
  signal?: AbortSignal;
  onDelta?: (text: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: unknown) => void;
}

/**
 * Envía un prompt a Gemini con streaming usando Fetch API nativo.
 */
export async function streamGeminiCompletion(opts: GeminiStreamOptions): Promise<void> {
  const key = getGeminiKey();
  if (!key) {
    opts.onError?.(new Error('No hay API key de Gemini configurada.'));
    return;
  }

  const modelId = opts.model ?? getGeminiModel();
  // Limpiamos el modelId por si trae 'models/' prefijado (la URL ya lo pide)
  const cleanModelId = modelId.replace('models/', '');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelId}:streamGenerateContent?alt=sse&key=${key}`;

  try {
    const contents = [...opts.history];
    
    const body = {
      contents: [
        ...contents,
        { role: 'user', parts: [{ text: opts.prompt }] }
      ],
      system_instruction: opts.systemInstruction ? {
        parts: [{ text: opts.systemInstruction }]
      } : undefined,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      }
    };

    console.log('[Gemini] Sending request to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Error ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message || errMsg;
      } catch {
        errMsg = errText || errMsg;
      }
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Cuerpo de respuesta no disponible');

    let fullText = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        try {
          const jsonStr = trimmed.replace('data: ', '').trim();
          if (!jsonStr) continue;
          const data = JSON.parse(jsonStr);
          const candidates = data.candidates || [];
          const textDelta = candidates[0]?.content?.parts?.[0]?.text || '';
          
          if (textDelta) {
            fullText += textDelta;
            opts.onDelta?.(fullText);
          }
        } catch (e) {
          // A veces los fragmentos de JSON vienen partidos entre líneas data:
          // Ignoramos errores de parseo parciales y esperamos al siguiente bloque
          continue;
        }
      }
    }

    opts.onDone?.(fullText);
  } catch (e: any) {
    if (opts.signal?.aborted) return;
    console.error('[Gemini] Error:', e);
    opts.onError?.(e);
  }
}
