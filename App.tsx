
import React, { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    TrelloPowerUp: any;
    __TRELLO_INITIALIZED__?: boolean;
  }
}

const App: React.FC = () => {
  const [mode, setMode] = useState<'setup' | 'modal'>('setup');
  const [listData, setListData] = useState<{ id: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'powerup' | 'console'>('powerup');
  const [copied, setCopied] = useState(false);

  const tRef = useRef<any>(null);

  useEffect(() => {
    // Cálculo de URL para GitHub Pages
    const url = window.location.href.split('?')[0].split('#')[0].replace(/[^\/]*$/, '');
    setBaseUrl(url);

    if (window.TrelloPowerUp) {
      if (!window.__TRELLO_INITIALIZED__) {
        window.TrelloPowerUp.initialize({
          'list-actions': (t: any) => {
            return [{
              text: '🔢 Renumerar tarjetas',
              callback: (t: any) => {
                return t.list('id', 'name').then((list: any) => {
                  const modalUrl = `${url}index.html?listId=${list.id}&listName=${encodeURIComponent(list.name)}`;
                  return t.modal({
                    title: 'Renumerar: ' + list.name,
                    url: modalUrl,
                    height: 400
                  });
                });
              }
            }];
          }
        });
        window.__TRELLO_INITIALIZED__ = true;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('listId')) {
        setMode('modal');
        setListData({ id: params.get('listId')!, name: params.get('listName') || 'Lista' });
        tRef.current = window.TrelloPowerUp.iframe();
      }
    }
  }, []);

  const consoleScript = `
(function renumberTrelloList() {
  const listName = prompt("Nombre de la lista a renumerar:", "${listData?.name || ''}");
  if (!listName) return;
  
  const list = Array.from(document.querySelectorAll('.list')).find(l => 
    l.querySelector('.list-header-name-assist')?.innerText.trim() === listName
  );
  
  if (!list) return alert("❌ Lista '" + listName + "' no encontrada.");
  
  const cards = Array.from(list.querySelectorAll('.list-card'));
  console.log("📦 Procesando " + cards.length + " tarjetas...");
  
  cards.forEach((card, i) => {
    const titleEl = card.querySelector('.list-card-title');
    if (!titleEl) return;
    
    // Obtenemos solo el texto, ignorando etiquetas si las hay
    const currentName = titleEl.childNodes[titleEl.childNodes.length - 1].textContent.trim();
    const cleanName = currentName.replace(/^[\\d\\s.-]+/, '').trim();
    const newName = (i + 1).toString().padStart(2, '0') + ". " + cleanName;
    
    console.log("📝 " + currentName + " -> " + newName);
    
    // Trello usa React/Backbone internamente. 
    // Para que el cambio sea persistente vía consola, lo ideal es abrir y guardar,
    // pero este script visual ayuda a preparar el orden.
    titleEl.childNodes[titleEl.childNodes.length - 1].textContent = newName;
  });
  
  alert("✅ Renumeración visual completada. Nota: Los cambios en consola son locales. Usa el Power-Up para cambios permanentes.");
})();
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(consoleScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runRenumbering = async () => {
    if (!tRef.current || !listData) return;
    const t = tRef.current;
    setIsProcessing(true);
    setProgress(0);
    setLog(['🚀 Iniciando...']);

    try {
      const cards = await t.cards('all');
      const filtered = cards.filter((c: any) => c.idList === listData.id);
      
      for (let i = 0; i < filtered.length; i++) {
        const card = filtered[i];
        const cleanName = card.name.replace(/^[\d\s.-]+/, '').trim();
        const newTitle = `${(i + 1).toString().padStart(2, '0')}. ${cleanName}`;
        
        setLog(prev => [...prev, `Ok: ${newTitle}`]);
        await t.set(card.id, 'shared', 'name', newTitle);
        setProgress(Math.round(((i + 1) / filtered.length) * 100));
        await new Promise(r => setTimeout(r, 150));
      }
      setLog(prev => [...prev, '✨ ¡Listo!']);
      setTimeout(() => t.closeModal(), 1000);
    } catch (e) {
      setLog(prev => [...prev, '❌ Error de API']);
    } finally {
      setIsProcessing(false);
    }
  };

  if (mode === 'modal') {
    return (
      <div className="p-6 h-full bg-white flex flex-col font-sans">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-trello-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <i className="fas fa-sort-numeric-down text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Renumerar Lista</h2>
              <p className="text-[10px] font-bold text-trello-blue uppercase tracking-widest">{listData?.name}</p>
            </div>
          </div>
        </div>

        {!isProcessing && progress === 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Se renombrarán todas las tarjetas con el formato <span className="font-bold text-slate-700">01. Nombre</span> basado en su posición actual.
            </p>
            <button 
              onClick={runRenumbering}
              className="w-full bg-trello-blue hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
            >
              COMENZAR PROCESO
            </button>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-trello-blue transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 h-32 overflow-y-auto font-mono text-[10px] text-emerald-400 border border-slate-800">
              {log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-trello-blue rounded-2xl flex items-center justify-center text-white shadow-xl">
              <i className="fas fa-magic text-2xl"></i>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter">TRELLO RENUMERAR PRO</h1>
              <p className="text-slate-400 text-sm">Panel de Control y Utilidades</p>
            </div>
          </div>

          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('powerup')}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'powerup' ? 'bg-white shadow-sm text-trello-blue' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Configurar Power-Up
            </button>
            <button 
              onClick={() => setActiveTab('console')}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'console' ? 'bg-white shadow-sm text-trello-blue' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Script para Consola
            </button>
          </div>

          {activeTab === 'powerup' ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
                <h3 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
                  <i className="fas fa-link"></i> URL del Conector
                </h3>
                <p className="text-xs text-blue-600/80 mb-4 font-medium leading-relaxed">
                  Copia esta URL en la configuración de tu Power-Up en el Trello Developer Portal:
                </p>
                <div className="bg-white p-3 rounded-xl border border-blue-200 font-mono text-[10px] text-blue-700 break-all select-all shadow-inner">
                  {baseUrl}index.html
                </div>
              </div>
              <ul className="text-[11px] text-slate-500 space-y-2 list-none px-2">
                <li className="flex items-center gap-2"><i className="fas fa-check-circle text-trello-blue"></i> Activa la capacidad "List Actions"</li>
                <li className="flex items-center gap-2"><i className="fas fa-check-circle text-trello-blue"></i> Usa "index.html" explícitamente en la URL</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="relative group">
                <pre className="bg-slate-900 text-blue-300 p-6 rounded-3xl text-[10px] font-mono overflow-x-auto max-h-60 border border-slate-800 shadow-inner">
                  {consoleScript}
                </pre>
                <button 
                  onClick={handleCopy}
                  className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-bold transition-all backdrop-blur-sm border border-white/10"
                >
                  {copied ? '¡COPIADO!' : 'COPIAR SCRIPT'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 italic text-center">
                Pega este script en la consola (F12) de tu tablero de Trello para una renumeración rápida.
              </p>
            </div>
          )}
        </div>
        <div className="bg-[#f4f5f7] p-6 text-center border-t border-slate-100">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             Status: {window.TrelloPowerUp ? '⚡ SDK Activo' : '🔎 Buscando SDK...'}
           </p>
        </div>
      </div>
    </div>
  );
};

export default App;
