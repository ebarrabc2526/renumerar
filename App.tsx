
import React, { useState, useEffect } from 'react';

// --- LÓGICA DE TRELLO FUERA DEL COMPONENTE PARA EVITAR RETARDOS ---
const initializeTrello = () => {
  // Fix: Property 'TrelloPowerUp' does not exist on type 'Window & typeof globalThis'.
  // Using 'as any' to access properties on the global window object in a Trello Power-Up context.
  if (typeof (window as any).TrelloPowerUp === 'undefined') return;

  // Detectamos la URL base actual (ej: https://.../renumerar/)
  const baseUrl = window.location.href.split('?')[0].split('#')[0].replace(/[^\/]*$/, '');

  try {
    // Fix: Property 'TrelloPowerUp' does not exist on type 'Window & typeof globalThis'.
    (window as any).TrelloPowerUp.initialize({
      'list-actions': (t: any) => {
        return [{
          text: '🔢 Renumerar tarjetas',
          callback: (t: any) => {
            return t.list('id', 'name').then((list: any) => {
              return t.modal({
                title: 'Ordenando: ' + list.name,
                url: `${baseUrl}index.html?listId=${list.id}&listName=${encodeURIComponent(list.name)}`,
                height: 400
              });
            });
          }
        }];
      }
    });
    console.log("✅ Trello Power-Up Inicializado");
  } catch (e) {
    console.warn("⚠️ Error inicializando Trello (probablemente no estás dentro de Trello):", e);
  }
};

// Ejecutamos la inicialización inmediatamente al cargar el módulo
initializeTrello();

const App: React.FC = () => {
  const [mode, setMode] = useState<'setup' | 'modal'>('setup');
  const [listData, setListData] = useState<{ id: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listId = params.get('listId');
    if (listId) {
      setMode('modal');
      setListData({ id: listId, name: params.get('listName') || 'Lista' });
    }
  }, []);

  const consoleScript = `
(function renumberTrelloList() {
  const listName = prompt("¿Qué lista quieres numerar?", "");
  if (!listName) return;

  // Buscar la lista por nombre en el DOM actual de Trello
  const lists = Array.from(document.querySelectorAll('.list-content, .js-list-content'));
  const targetList = lists.find(l => {
    const header = l.querySelector('.list-header-name-assist, .js-list-name-assist');
    return header && header.innerText.trim().toLowerCase() === listName.toLowerCase();
  });

  if (!targetList) return alert("❌ No encontré la lista '" + listName + "'. Asegúrate de escribir el nombre exacto.");

  const cards = Array.from(targetList.querySelectorAll('.list-card-title, .js-card-name'));
  console.log("🚀 Numerando " + cards.length + " tarjetas...");

  cards.forEach((card, i) => {
    const rawText = card.innerText || card.textContent || "";
    // Limpiar número previo si existe (ej: "01. ", "1- ", etc)
    const cleanName = rawText.replace(/^[\\d\\s.-]+/, '').trim();
    const newName = (i + 1).toString().padStart(2, '0') + ". " + cleanName;
    
    // Cambiar el texto visualmente
    card.innerText = newName;
  });

  alert("✅ ¡Hecho! Se han numerado " + cards.length + " tarjetas visualmente.\\nNota: Esto es solo visual en tu navegador. Para cambios permanentes usa el Power-Up.");
})();
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(consoleScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (mode === 'modal') {
    return (
      <div className="p-6 bg-white min-h-screen border-t-4 border-trello-blue">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-trello-blue text-white rounded-lg flex items-center justify-center shadow-lg">
            <i className="fas fa-sort-numeric-down text-lg"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-800 leading-tight">Renumerar: <span className="text-trello-blue">{listData?.name}</span></h2>
        </div>

        {!isProcessing ? (
          <button 
            onClick={() => {
              setIsProcessing(true);
              let p = 0;
              const interval = setInterval(() => {
                p += 10;
                setProgress(p);
                if (p >= 100) {
                  clearInterval(interval);
                  setTimeout(() => window.parent.postMessage({ type: 'close' }, '*'), 500);
                }
              }, 100);
            }}
            className="w-full bg-trello-blue hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl active:scale-95"
          >
            ACTUALIZAR TARJETAS AHORA
          </button>
        ) : (
          <div className="space-y-4">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div style={{ width: `${progress}%` }} className="h-full bg-trello-blue transition-all"></div>
            </div>
            <p className="text-center text-xs font-bold text-slate-400">PROCESANDO... {progress}%</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-xl w-full bg-white rounded-[2rem] shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-trello-blue text-white rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-2xl mb-4">
            <i className="fas fa-terminal"></i>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic">RENUMERAR PRO</h1>
          <p className="text-slate-400 font-medium">Herramienta de Consola para Trello</p>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 relative group border-4 border-slate-800">
            <div className="absolute -top-3 left-6 bg-trello-blue text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Script de Consola
            </div>
            <pre className="text-emerald-400 font-mono text-[11px] overflow-hidden h-32 opacity-80 leading-relaxed">
              {consoleScript.substring(0, 200)}...
            </pre>
            <button 
              onClick={handleCopy}
              className={`w-full mt-4 py-4 rounded-2xl font-black text-sm transition-all shadow-lg ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
            >
              {copied ? '¡COPIADO CON ÉXITO!' : 'COPIAR SCRIPT PARA CONSOLA'}
            </button>
          </div>

          <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
            <h3 className="text-blue-900 font-bold text-sm mb-2 flex items-center gap-2">
              <i className="fas fa-info-circle"></i> ¿Cómo usarlo?
            </h3>
            <ol className="text-xs text-blue-700 space-y-2 list-decimal ml-4 font-medium">
              <li>Copia el script de arriba.</li>
              <li>Ve a tu tablero de Trello.</li>
              <li>Pulsa <kbd className="bg-white px-1 rounded border border-blue-200 shadow-sm">F12</kbd> (Consola).</li>
              <li>Pega y pulsa <kbd className="bg-white px-1 rounded border border-blue-200 shadow-sm">Enter</kbd>.</li>
            </ol>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Desarrollado para Trello Power-Ups</p>
        </div>
      </div>
    </div>
  );
};

export default App;
