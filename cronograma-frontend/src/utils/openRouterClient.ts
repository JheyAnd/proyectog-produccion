/**
 * OpenRouter client — API compatible con OpenAI.
 * Modelos gratuitos disponibles en https://openrouter.ai/models?q=free
 */

export const LS_KEY       = 'pcm_openrouter_key';
export const LS_MODEL_KEY = 'pcm_openrouter_model';
export const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

/** Evento global que se dispara cuando la API key cambia (save/clear). */
export const OPENROUTER_KEY_EVENT = 'pcm:openrouter-key-changed';

/** Modelos gratuitos disponibles en OpenRouter. */
export const OPENROUTER_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B',      description: 'Potente y gratuito · Recomendado' },
  { id: 'deepseek/deepseek-chat-v3-0324:free',    label: 'DeepSeek Chat V3',    description: 'Razonamiento avanzado · Gratuito' },
  { id: 'google/gemini-2.0-flash-exp:free',        label: 'Gemini 2.0 Flash',   description: 'Google · Experimental gratuito' },
  { id: 'qwen/qwen3-14b:free',                     label: 'Qwen3 14B',           description: 'Alibaba · Contexto amplio' },
  { id: 'mistralai/mistral-7b-instruct:free',      label: 'Mistral 7B',          description: 'Ligero y rápido · Gratuito' },
];

export function getOpenRouterKey(): string | null {
  const k = localStorage.getItem(LS_KEY);
  return k && k.trim().length > 0 ? k : null;
}

export function getOpenRouterModel(): string {
  const stored = localStorage.getItem(LS_MODEL_KEY);
  const validIds = OPENROUTER_MODELS.map(m => m.id);
  if (!stored || !validIds.includes(stored)) {
    localStorage.setItem(LS_MODEL_KEY, DEFAULT_MODEL);
    return DEFAULT_MODEL;
  }
  return stored;
}

export function emitOpenRouterKeyChanged(): void {
  window.dispatchEvent(new Event(OPENROUTER_KEY_EVENT));
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterStreamOptions {
  messages: ChatMsg[];
  model?: string;
  signal?: AbortSignal;
  onDelta?: (accumulatedText: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: unknown) => void;
}

/**
 * Envía mensajes a OpenRouter con streaming (SSE compatible con OpenAI).
 */
export async function streamOpenRouterCompletion(opts: OpenRouterStreamOptions): Promise<void> {
  const key = getOpenRouterKey();
  if (!key) {
    opts.onError?.(new Error('No hay API key de OpenRouter configurada.'));
    return;
  }

  const model = opts.model ?? getOpenRouterModel();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pcmejia.app',
        'X-Title': 'PC Mejía Ingeniería',
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
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
    if (!reader) throw new Error('Cuerpo de respuesta no disponible.');

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

        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const data = JSON.parse(jsonStr);
          const delta = data.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            opts.onDelta?.(fullText);
          }
        } catch {
          // Fragmento incompleto — ignorar y esperar siguiente chunk
          continue;
        }
      }
    }

    opts.onDone?.(fullText);
  } catch (e: any) {
    if (opts.signal?.aborted) return;
    console.error('[OpenRouter] Error:', e);
    opts.onError?.(e);
  }
}
