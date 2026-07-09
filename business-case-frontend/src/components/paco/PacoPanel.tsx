/**
 * Panel expandido de PaCo Mejía: chat completo con streaming.
 * Se monta cuando `pacoStore.isOpen === true`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Trash2, X, Send, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import PacoMascot from './PacoMascot';
import { usePacoStore } from '@/stores/pacoStore';
import { usePageContextStore, getRouteDescription } from '@/stores/pageContextStore';
import { useProjectsTracking } from '@/data/projectsTracking';
import { AI_CHANGED_EVENT, hasActiveKey, streamAI } from '@/utils/aiClient';
import { PACO_SYSTEM_PROMPT, buildPageContextMessage } from '@/constants/pacoPrompt';

const QUICK_PROMPTS = [
  '¿Dónde estoy?',
  'Explícame esta página',
  '¿Qué puedo hacer aquí?',
];

export default function PacoPanel() {
  const { isOpen, history, streamText, streaming, close, appendUser, appendAssistant, setStreamText, setStreaming, clearHistory } = usePacoStore();
  const pageCtx = usePageContextStore((s) => s.context);
  const [allProjects] = useProjectsTracking();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [hasKey, setHasKey] = useState(() => hasActiveKey());

  useEffect(() => {
    const checkKey = () => setHasKey(hasActiveKey());
    window.addEventListener(AI_CHANGED_EVENT, checkKey);
    return () => window.removeEventListener(AI_CHANGED_EVENT, checkKey);
  }, []);

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Título de ruta para el header (usa contexto registrado o fallback por ruta)
  const { title: routeTitle } = useMemo(() => {
    if (pageCtx?.title) return { title: pageCtx.title };
    return getRouteDescription(pathname);
  }, [pageCtx, pathname]);

  // Autoscroll al final cuando hay nuevo contenido
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, streamText]);

  // Al cerrar el panel: cancelar stream pendiente
  useEffect(() => {
    if (!isOpen && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreaming(false);
      setStreamText('');
    }
  }, [isOpen, setStreaming, setStreamText]);

  // Auto-resize del textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 96) + 'px';
  }, [input]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (!hasKey) {
      setError('Configura tu API key en el Analizador IA para activar a PaCo.');
      return;
    }
    setError(null);

    // 1) Añadir mensaje del usuario y resetear input
    appendUser(trimmed);
    setInput('');
    setStreaming(true);
    setStreamText('');

    // 2) Construir contexto de página (explícito o fallback)
    const routeInfo = getRouteDescription(pathname);
    const title = pageCtx?.title ?? routeInfo.title;
    const description = pageCtx?.description ?? routeInfo.description;

    // Fallback DOM si no hay contexto estructurado (truncado a 2000 chars)
    let domSnippet: string | undefined;
    if (!pageCtx) {
      const main = document.querySelector('main');
      const txt = main?.innerText?.replace(/\s+/g, ' ').trim();
      if (txt && txt.length > 0) domSnippet = txt.slice(0, 2000);
    }

    // 3) Generar resumen de proyectos para contexto global
    const projectsSummary = allProjects.map(p =>
      `- ${p.nombre_proyecto} (${p.codigo_proyecto}): Cliente ${p.cliente}, Director ${p.director_proyectos}`
    ).join('\n');

    const contextMsg = buildPageContextMessage({
      pathname,
      title,
      description,
      keyMetrics: pageCtx?.keyMetrics,
      dataSummary: (pageCtx?.dataSummary || '') + (allProjects.length > 0 ? `\n\nPROYECTOS EN PORTAFOLIO:\n${projectsSummary}` : ''),
      domSnippet,
    });

    // 4) Stream
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // Construir mensajes en formato unificado
      const messages = [
        { role: 'system' as const, content: PACO_SYSTEM_PROMPT + '\n\n' + contextMsg },
        ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: trimmed },
      ];

      await streamAI({
        messages,
        signal: ac.signal,
        onDelta: (t) => setStreamText(t),
        onDone: (full) => {
          // Detectar y ejecutar comandos de navegación: [NAVIGATE: /ruta]
          let cleanText = full;
          const navMatch = full.match(/\[NAVIGATE:\s*([^\]]+)\]/);

          if (navMatch) {
            const targetPath = navMatch[1].trim();
            cleanText = full.replace(/\[NAVIGATE:\s*[^\]]+\]/g, '').trim();
            setTimeout(() => navigate(targetPath), 600);
          }

          appendAssistant(cleanText);
          setStreamText('');
          setStreaming(false);
          abortRef.current = null;
        },
        onError: (e: any) => {
          appendAssistant(`❌ Error: ${e.message}`);
          setStreaming(false);
          abortRef.current = null;
        }
      });
    } catch (e: any) {
      if (ac.signal.aborted) return;
      appendAssistant(`❌ Error: ${e.message}`);
      setStreaming(false);
      abortRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, hasKey, pathname, pageCtx, allProjects, history, appendUser, appendAssistant, setStreaming, setStreamText, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={clsx(
        'fixed bottom-6 right-6 z-[60]',
        'w-[380px] h-[560px] max-h-[calc(100vh-3rem)] max-w-[calc(100vw-3rem)]',
        'rounded-2xl bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 shadow-2xl',
        'flex flex-col overflow-hidden',
        'transition-all duration-300',
      )}
      style={{ animation: 'paco-in 240ms ease-out' }}
    >
      {/* Keyframe inline (una sola vez, scoped al panel) */}
      <style>{`
        @keyframes paco-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes paco-caret {
          0%, 60% { opacity: 1; }
          61%, 100% { opacity: 0; }
        }
        .paco-caret { animation: paco-caret 1s step-end infinite; }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 text-white dark:from-primary-800 dark:via-primary-900 dark:to-primary-950">
        <div className="relative shrink-0">
          {/* Avatar: PaCo en el header del panel */}
          <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-white/20 bg-gradient-to-br from-[#1a3a6b] to-[#0a1e3d]">
            <PacoMascot animated={hasKey} fit="contain" className="w-full h-full" />
          </div>
          {hasKey && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-primary-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">PaCo Mejía</p>
          <p className="text-[10px] text-primary-100/90 truncate">
            {hasKey ? routeTitle : 'Inactivo · configura tu API'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearHistory}
            aria-label="Limpiar conversación"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Minimizar panel"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar panel de PaCo"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-steel-50/60 dark:from-steel-700/30 to-white dark:to-steel-800"
      >
        {history.length === 0 && !streaming && (
          <EmptyState hasKey={hasKey} onPick={(p) => send(p)} />
        )}

        {history.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}

        {streaming && (
          <Bubble role="assistant" content={streamText} streaming />
        )}
      </div>

      {/* Error (si aplica) */}
      {error && (
        <div className="px-4 py-2 text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-steel-100 dark:border-steel-700 p-3 bg-white dark:bg-steel-800">
        <div
          className={clsx(
            'flex items-end gap-2 rounded-xl border bg-steel-50/60 dark:bg-steel-700/50 px-3 py-2 transition',
            'focus-within:border-primary-400 focus-within:bg-white dark:focus-within:bg-steel-700 focus-within:shadow-sm',
            hasKey ? 'border-steel-200 dark:border-steel-600' : 'border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20',
          )}
        >
          <label htmlFor="paco-input" className="sr-only">Mensaje para PaCo</label>
          <textarea
            id="paco-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasKey ? 'Pregúntale a PaCo…' : 'Configura OpenRouter en Analizador IA'}
            disabled={!hasKey || streaming}
            aria-label="Mensaje para PaCo"
            className="flex-1 resize-none bg-transparent outline-none text-[13px] text-steel-800 dark:text-steel-100 placeholder-steel-400 dark:placeholder-steel-500 max-h-24"
          />
          <button
            type="submit"
            disabled={!hasKey || streaming || !input.trim()}
            className={clsx(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition',
              input.trim() && hasKey && !streaming
                ? 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white shadow'
                : 'bg-steel-200 dark:bg-steel-700 text-steel-400 dark:text-steel-500 cursor-not-allowed',
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {!hasKey && (
          <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">
            <Link to="/settings" className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-200">
              Abrir Analizador IA
            </Link>{' '}
            para configurar tu API key.
          </p>
        )}
      </form>
    </div>
  );
}

/* ─────────────── Subcomponents ─────────────── */

function EmptyState({ hasKey, onPick }: { hasKey: boolean; onPick: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center px-2 py-3">
      {/* ── PaCo: aspect-ratio exacto al PNG (1504×800) → sin bordes negros ── */}
      <div className="w-full rounded-2xl overflow-hidden shadow-inner mb-3" style={{ aspectRatio: '1504/800' }}>
        <PacoMascot animated={hasKey} fit="cover" className="w-full h-full" />
      </div>

      {/* Quick prompts */}
      {hasKey && (
        <div className="w-full flex flex-col gap-2">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              className="text-left text-[11px] text-steel-700 dark:text-steel-300 bg-white dark:bg-steel-700 border border-steel-200 dark:border-steel-600 rounded-lg px-3 py-2 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-steel-600 hover:text-primary-800 dark:hover:text-primary-300 transition shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {!hasKey && (
        <div className="w-full rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-3 py-2 text-left">
          <p className="text-[11px] text-amber-900 dark:text-amber-200 font-semibold mb-1">PaCo está inactivo</p>
          <p className="text-[10px] text-amber-800 dark:text-amber-300">
            Ve a <Link to="/settings" className="underline font-semibold">Analizador IA</Link>,
            configura tu API key y guárdala. Me activaré automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}

function Bubble({ role, content, streaming }: { role: 'user' | 'assistant'; content: string; streaming?: boolean }) {
  const isUser = role === 'user';
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[85%] px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words shadow-sm',
          isUser
            ? 'bg-primary-600 dark:bg-primary-700 text-white rounded-2xl rounded-br-sm'
            : 'bg-white dark:bg-steel-700 text-steel-800 dark:text-steel-100 border border-steel-200 dark:border-steel-600 rounded-2xl rounded-bl-sm',
        )}
      >
        {content}
        {streaming && <span className="paco-caret ml-0.5 text-primary-500 dark:text-primary-400">▍</span>}
      </div>
    </div>
  );
}
