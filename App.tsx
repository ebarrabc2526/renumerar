
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
  const [appUrl, setAppUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  
  const [status, setStatus] = useState({
    sdkLoaded: false,
    initialized: false,
    isTrelloContext: false
  });
  
  const tRef = useRef<any>(null);

  useEffect(() => {
    // 1. Determinar la URL base de forma ultra-precisa
    const currentUrl = window.location.href.split('?')[0].split('#')[0];
    const baseUrl = currentUrl.endsWith('/') ? currentUrl.slice(0, -1) : currentUrl;
    setAppUrl(baseUrl);

    console.log("🛠️ Inicializando Power-Up en:", baseUrl);

    if (window.TrelloPowerUp) {
      setStatus(s => ({ ...s, sdkLoaded: true }));

      // 2. Lógica de Inicialización (Debe ser rápida para que Trello vea el botón)
      if (!window.__TRELLO_INITIALIZED__) {
        window.TrelloPowerUp.initialize({
          'list-actions': (t: any) => {
            console.log("📋 Trello solicitó 'list-actions'");
            return [{
              text: '🔢 Renumerar esta lista',
              callback: (t: any) => {
                return t.list('id', 'name').then((list: any) => {
                  const modalUrl = `${baseUrl}/?listId=${list.id}&listName=${encodeURIComponent(list.name)}`;
                  console.log("📦 Abriendo modal con URL:", modalUrl);
                  return t.modal({
                    title: 'Renumerar: ' + list.name,
                    url: modalUrl,
                    height: 350
                  });
                });
              }
            }];
          }
        });
        
        window.__TRELLO_INITIALIZED__ = true;
        setStatus(s => ({ ...s, initialized: true }));
        
        // MOSTRAR MENSAJE DE ÉXITO POR 3 SEGUNDOS
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        console.log("✅ Power-Up registrado correctamente en Trello");
      }

      // 3. Detectar si estamos en modo Modal (ejecutándose dentro de Trello)
      const urlParams = new URLSearchParams(window.location.search);
      const listId = urlParams.get('listId');
      
      if (listId) {
        setMode('modal');
        setListData({ id: listId, name: urlParams.get('listName') || 'Lista' });
        tRef.current = window.TrelloPowerUp.iframe();
        setStatus(s => ({ ...s, isTrelloContext: true }));
      }
    } else {
      console.error("❌ No se encontró el script de Trello (power-up.min.js)");
    }
  }, []);

  const runRenumbering = async () => {
    if (!listData || !tRef.current) return;
    const t = tRef.current;
    setIsProcessing(true);
    setLog(['Iniciando proceso de renumeración...']);
    
    try {
      const cards = await t.cards('all');
      const listCards = cards.filter((c: any) => c.idList === listData.id);
      
      if (listCards.length === 0) {
        setLog(prev => [...prev, '⚠️ No hay tarjetas en esta lista.']);
        setIsProcessing(false);
        return;
      }

      for (let i = 0; i < listCards.length; i++) {
        const card = listCards[i];
        const cleanName = card.name.replace(/^[\d\s.-]+/, '').trim();
        const newTitle = `${(i + 1).toString().padStart(2, '0')}. ${cleanName}`;
        
        setLog(prev => [...prev, `Actualizando: ${newTitle}`]);
        setProgress(Math.round(((i + 1) / listCards.length) * 100));

        // Intento de actualización (Requiere permisos de escritura en el Power-Up)
        try {
          await t.set(card.id, 'shared', 'name', newTitle);
        } catch (err) {
          console.warn("Fallo al escribir. Asegúrate de tener permisos en el portal de Trello.");
        }
        
        await new Promise(r => setTimeout(r, 300));
      }

      setLog(prev => [...prev, '✅ Proceso finalizado.']);
      setTimeout(() => t.closeModal(), 1500);
    } catch (error) {
      setLog(prev => [...prev, '❌ Error al conectar con Trello.']);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- COMPONENTE DE NOTIFICACIÓN (TOAST) ---
  const Toast = () => (
    <div className={`fixed top-5 right-5 z-[9999] transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
          <i className="fas fa-rocket text-sm"></i>
        </div>
        <div>
          <p className="font-bold text-sm tracking-tight">Power-Up de Renumeración</p>
          <p className="text-[11px] text-blue-400 font-medium uppercase tracking-widest">Activado con éxito</p>
        </div>
      </div>
    </div>
  );

  // VISTA MODAL
  if (mode === 'modal') {
    return (
      <div className="p-6 bg-white min-h-screen flex flex-col font-sans border-t-8 border-blue-600">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100 font-black text-xl">#</div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 leading-none">Renumerar</h2>
              <p className="text-xs text-blue-600 font-bold mt-1 uppercase tracking-tighter">{listData?.name}</p>
            </div>
          </div>
        </div>

        {!isProcessing && progress === 0 ? (
          <div className="space-y-6">
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Se reordenarán los nombres de las tarjetas como <span className="text-slate-900 font-bold">01. Nombre</span>, <span className="text-slate-900 font-bold">02. Nombre</span>...
            </p>
            <button 
              onClick={runRenumbering}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              <i className="fas fa-play-circle text-xl"></i> EJECUTAR AHORA
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <div className="flex justify-between text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                <span>Progreso</span>
                <span>{progress}%</span>
               </div>
               <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                <div style={{ width: `${progress}%` }} className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.4)]"></div>
               </div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-4 h-24 overflow-y-auto font-mono text-[10px] text-emerald-400 border border-slate-800">
              {log.map((line, i) => <div key={i} className="mb-1 opacity-80">{line}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // VISTA DE CONFIGURACIÓN
  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6 md:p-12 flex flex-col items-center font-sans">
      <Toast />
      
      <div className="max-w-2xl w-full space-y-10">
        <header className="text-center space-y-6">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl mx-auto flex items-center justify-center text-blue-600 text-5xl relative group">
            <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <i className="fas fa-sort-numeric-down relative"></i>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Renumerar Pro</h1>
            <p className="text-slate-500 text-lg font-medium italic">El Power-Up definitivo para listas ordenadas.</p>
          </div>
        </header>

        <main className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-10 space-y-8">
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-3">
              <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] block">URL del Iframe Connector</label>
              <div className="flex gap-3">
                <input readOnly value={appUrl} className="flex-1 bg-white border-2 border-blue-100 px-5 py-3 rounded-2xl text-sm font-mono text-blue-700 outline-none" />
                <button onClick={() => {navigator.clipboard.writeText(appUrl); alert("¡URL Copiada!")}} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-200">COPIAR</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fas fa-check-circle text-green-500"></i> Estado del SDK
                </h4>
                <p className="text-sm font-bold text-slate-500">{status.sdkLoaded ? 'Conectado a Trello' : 'Esperando SDK...'}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fas fa-cog text-blue-500"></i> Inicialización
                </h4>
                <p className="text-sm font-bold text-slate-500">{status.initialized ? 'Completada' : 'Pendiente'}</p>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl"><i className="fas fa-question-circle"></i></div>
               <h3 className="text-xl font-bold mb-4 flex items-center gap-3 relative">
                 <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs">?</span>
                 ¿Sigue sin aparecer el botón?
               </h3>
               <ul className="space-y-4 text-sm text-slate-400 relative">
                 <li className="flex gap-3"><span className="text-blue-500 font-black">1.</span> En Trello, ve a "Capabilities" y marca <b>"List actions"</b>.</li>
                 <li className="flex gap-3"><span className="text-blue-500 font-black">2.</span> Ve a tu tablero, pulsa el botón Power-Ups y asegúrate de haber <b>"Añadido"</b> este Power-Up manualmente.</li>
                 <li className="flex gap-3"><span className="text-blue-500 font-black">3.</span> Pulsa <b>Ctrl + F5</b> en la pestaña de Trello para forzar la actualización.</li>
               </ul>
            </div>
          </div>
        </main>

        <footer className="text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] pb-10">
          Trello Power-Up Framework • 2024
        </footer>
      </div>
    </div>
  );
};

export default App;
