
import React, { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    TrelloPowerUp: any;
  }
}

const App: React.FC = () => {
  const [mode, setMode] = useState<'setup' | 'modal'>('setup');
  const [listData, setListData] = useState<{ id: string; name: string } | null>(null);
  const [appUrl, setAppUrl] = useState('');
  const [isBlob, setIsBlob] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const tRef = useRef<any>(null);

  useEffect(() => {
    if (window.TrelloPowerUp) {
      const t = window.TrelloPowerUp.iframe();
      tRef.current = t;

      window.TrelloPowerUp.initialize({
        'list-actions': (t: any) => {
          return [{
            text: '🔢 Renumerar esta lista',
            callback: (t: any) => {
              return t.list('id', 'name').then((list: any) => {
                return t.modal({
                  title: 'Renumerar: ' + list.name,
                  url: './?listId=' + list.id + '&listName=' + encodeURIComponent(list.name),
                  height: 350
                });
              });
            }
          }];
        }
      });

      const urlParams = new URLSearchParams(window.location.search);
      const listId = urlParams.get('listId');
      const listName = urlParams.get('listName');

      if (listId) {
        setMode('modal');
        setListData({ id: listId, name: listName || 'Lista' });
      }
    }

    let currentUrl = window.location.href.split('?')[0].split('#')[0];
    if (currentUrl.startsWith('blob:')) {
      setIsBlob(true);
    }
    setAppUrl(currentUrl);
  }, []);

  const runRenumbering = async () => {
    if (!listData || !tRef.current) return;
    const t = tRef.current;
    setIsProcessing(true);
    setLog(['Obteniendo tarjetas...']);
    
    try {
      const cards = await t.cards('all');
      const listCards = cards.filter((c: any) => c.idList === listData.id);
      
      if (listCards.length === 0) {
        setLog(prev => [...prev, '⚠️ Lista vacía.']);
        setIsProcessing(false);
        return;
      }

      for (let i = 0; i < listCards.length; i++) {
        const card = listCards[i];
        const newTitle = `${(i + 1).toString().padStart(2, '0')}. ${card.name.replace(/^[\d\s.-]+/, '').trim()}`;
        setLog(prev => [...prev, `Progreso: ${newTitle}`]);
        setProgress(Math.round(((i + 1) / listCards.length) * 100));
        await new Promise(r => setTimeout(r, 300));
      }

      setLog(prev => [...prev, '✅ ¡Listo!']);
      setTimeout(() => t.closeModal(), 1500);
    } catch (error) {
      setLog(prev => [...prev, '❌ Error de API']);
    } finally {
      setIsProcessing(false);
    }
  };

  if (mode === 'modal') {
    return (
      <div className="p-6 bg-white min-h-screen flex flex-col font-sans">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md font-bold">#</div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-tight">Renumerar Lista</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{listData?.name}</p>
          </div>
        </div>

        {!isProcessing && progress === 0 ? (
          <button 
            onClick={runRenumbering}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="fas fa-play"></i> COMENZAR
          </button>
        ) : (
          <div className="space-y-4">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 h-32 overflow-y-auto font-mono text-[10px] text-blue-300 border border-slate-700">
              {log.map((line, i) => <div key={i} className="mb-1 opacity-80">> {line}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center font-sans">
      <div className="max-w-3xl w-full space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold tracking-widest uppercase mb-2">Power-Up Workshop</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Despliegue sin costes</h1>
          <p className="text-slate-500 max-w-md mx-auto">Sigue estos pasos para activar tu Power-Up gratis y sin usar tarjetas de crédito.</p>
        </div>

        {/* ALERTA DE BLOQUEO */}
        {isBlob && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl shadow-sm">
            <div className="flex gap-4">
              <div className="text-amber-500 text-2xl"><i className="fas fa-shield-alt"></i></div>
              <div>
                <h3 className="font-bold text-amber-900 text-lg">Trello requiere HTTPS Real</h3>
                <p className="text-amber-800 text-sm mt-1">
                  Actualmente estás viendo una URL <b>blob:</b>. Trello no permite cargar Power-Ups desde la memoria local del navegador por seguridad. 
                  <b> Debes subir el código a un servidor gratuito para que funcione.</b>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* OPCION GRATUITA 1: VERCEL */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-bold text-sm">V</div>
              <h3 className="font-bold text-slate-800">Opción 1: Vercel</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Ideal para despliegue rápido con un solo clic conectando tu GitHub.</p>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4 font-medium">
              <li>Crea una cuenta en <a href="https://vercel.com" target="_blank" className="text-blue-600 underline">Vercel.com</a> (Gratis).</li>
              <li>Sube este código a un repositorio de GitHub.</li>
              <li>En Vercel, selecciona "New Project" y elige tu repo.</li>
              <li>¡Vercel te dará una URL HTTPS gratis para siempre!</li>
            </ol>
          </div>

          {/* OPCION GRATUITA 2: GITHUB PAGES */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm"><i className="fab fa-github"></i></div>
              <h3 className="font-bold text-slate-800">Opción 2: GitHub Pages</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">La opción clásica. Totalmente gratuita y sin límites para este tipo de apps.</p>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4 font-medium">
              <li>Crea un repositorio en GitHub.</li>
              <li>Sube el archivo <code className="bg-slate-100 px-1">index.html</code> y el resto del código.</li>
              <li>Ve a <b>Settings > Pages</b>.</li>
              <li>Activa la rama "main" como fuente.</li>
              <li>Obtendrás una URL <code className="text-blue-600">tusuario.github.io/repo</code>.</li>
            </ol>
          </div>
        </div>

        {/* PASOS FINALES EN TRELLO */}
        <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl text-white">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <i className="fas fa-clipboard-check"></i>
            Configuración en Trello
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Tu Iframe Connector URL (Una vez desplegado)</label>
              <div className="bg-blue-700/50 p-4 rounded-2xl border border-blue-400/30 flex items-center gap-3">
                <i className="fas fa-link text-blue-200"></i>
                <input 
                  readOnly 
                  value={appUrl} 
                  className="bg-transparent flex-1 text-xs font-mono outline-none text-blue-100" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-500/30 p-4 rounded-2xl border border-blue-400/20">
                <div className="font-bold text-sm mb-1">1. Registro</div>
                <p className="text-[10px] opacity-80">Crea el Power-Up en el Trello Admin con tu nueva URL HTTPS.</p>
              </div>
              <div className="bg-blue-500/30 p-4 rounded-2xl border border-blue-400/20">
                <div className="font-bold text-sm mb-1">2. Capabilities</div>
                <p className="text-[10px] opacity-80">Marca la casilla <b>"List Actions"</b> en el portal de Trello.</p>
              </div>
              <div className="bg-blue-500/30 p-4 rounded-2xl border border-blue-400/20">
                <div className="font-bold text-sm mb-1">3. Activación</div>
                <p className="text-[10px] opacity-80">Añade el Power-Up al tablero desde el menú de Trello.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 text-[10px] font-medium">
          No necesitas Google Cloud para proyectos pequeños. Usa GitHub o Vercel para mantenerlo gratis.
        </p>

      </div>
    </div>
  );
};

export default App;
