import React, { useState, useRef, useEffect } from 'react';

export default function FluxoAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Hola 👋 Soy **Fluxo**, tu agente financiero. Tengo acceso completo a los proyectos de PC Mejía: series temporales, ingresos, egresos, materiales, mano de obra y cada partida detallada. ¿En qué te ayudo?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Esto es una respuesta simulada de Fluxo. En producción, aquí conectaríamos con el agente LLM enviándole el contexto del proyecto activo y los datos financieros.' }]);
      setIsLoading(false);
    }, 1500);
  };

  const handleQuickAsk = (q: string) => {
    setInput(q);
    // Give it a tiny tick to update state before sending
    setTimeout(() => {
      handleSend(); // Will use the state from previous tick (empty), so we pass directly
    }, 0);
  };

  const directSend = (q: string) => {
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setIsLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: `Analizando consulta: "${q}".\n\nAquí iría la respuesta del agente basada en los datos de la tabla...` }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-full flex items-center justify-center text-2xl shadow-lg hover:scale-105 transition-transform z-50"
        title="Fluxo — Agente Financiero IA"
      >
        🤖
      </button>

      <div className={`fixed bottom-[86px] right-6 w-[420px] max-w-[calc(100vw-48px)] max-h-[600px] h-[80vh] bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-2xl z-[299] flex flex-col shadow-2xl transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0 opacity-100 pointer-events-auto' : 'scale-95 translate-y-4 opacity-0 pointer-events-none'}`}>
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-steel-200 dark:border-steel-700 bg-primary-50 dark:bg-steel-900 rounded-t-2xl flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">🤖</div>
          <div>
            <div className="font-semibold text-sm text-steel-900 dark:text-white">✦ Fluxo</div>
            <div className="text-[10px] text-success-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-success-500 rounded-full animate-pulse"></span>
              Activo — Agente Financiero PC Mejía
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="ml-auto text-steel-400 hover:text-steel-600 dark:hover:text-white">
            ✖
          </button>
        </div>

        {/* Quick questions */}
        <div className="flex overflow-x-auto gap-2 p-3 border-b border-steel-100 dark:border-steel-700/50 bg-steel-50/50 dark:bg-steel-800/30 shrink-0 custom-scrollbar">
          {[
            { icon: '🚨', text: 'Mayor riesgo', q: '¿Cuáles proyectos tienen mayor riesgo financiero?' },
            { icon: '📊', text: 'Mes actual', q: 'Analiza el flujo del mes actual May 2026' },
            { icon: '📉', text: 'Déficits', q: '¿Qué proyectos tienen déficit acumulado?' },
            { icon: '💡', text: 'Recomendaciones', q: 'Dame las 3 recomendaciones gerenciales más importantes' },
            { icon: '💰', text: 'VPN', q: '¿Cuál es el VPN estimado del portafolio total?' }
          ].map((item, idx) => (
            <button 
              key={idx}
              onClick={() => directSend(item.q)}
              className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-steel-700 border border-steel-200 dark:border-steel-600 rounded-full text-[11px] text-steel-600 dark:text-steel-300 hover:border-primary-500 hover:text-primary-600 transition-colors shadow-sm"
            >
              {item.icon} {item.text}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-steel-50/30 dark:bg-steel-900/20">
          {messages.map((m, idx) => (
            <div key={idx} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-primary-600 text-white self-end rounded-br-sm' : 'bg-white dark:bg-steel-700 border border-steel-200 dark:border-steel-600 text-steel-800 dark:text-steel-200 self-start rounded-bl-sm shadow-sm'}`}>
              <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') }} />
            </div>
          ))}
          {isLoading && (
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-white dark:bg-steel-700 border border-steel-200 dark:border-steel-600 text-steel-800 dark:text-steel-200 self-start rounded-bl-sm shadow-sm flex items-center gap-2">
              <span className="animate-pulse text-primary-500">●</span> Analizando...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 rounded-b-2xl shrink-0 flex gap-2">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Consulta financiera..."
            className="flex-1 resize-none h-10 min-h-[40px] max-h-32 bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-xl px-3 py-2.5 text-sm text-steel-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 custom-scrollbar"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-primary-700 transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
}
