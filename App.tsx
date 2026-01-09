
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
  const [sdkStatus, setSdkStatus] = useState('Esperando SDK...');
  
  const tRef = useRef<any>(null);

  useEffect(() => {
    // 1. Detección inmediata de URL
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
    setAppUrl(baseUrl);

    console.log("🚀 Iniciando App.tsx en:", baseUrl);

    // 2. Inicialización del Power-Up
    if (window.TrelloPowerUp) {
      setSdkStatus('SDK Detectado. Inicializando...');
      
      if (!window.__TRELLO_INITIALIZED__) {
        try {
          window.TrelloPowerUp.initialize({
            'list-actions': (t: any) => {
              console.log("⭐ Trello solicitó botones de lista");
              return [{
                text: '🔢 Renumerar esta lista',
                callback: (t: any) => {
                  return t.list('id', 'name').then((list: any) => {
                    const modalUrl = `${baseUrl}/?listId=${list.id}&listName=${encodeURIComponent(list.name)}`;
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
          setSdkStatus('Power-Up Registrado ✅');
          
          // ACTIVAR MENSAJE VISUAL
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          
          console.log("✅ Registro exitoso en Trello");
        } catch (err) {
          console.error("❌ Error en initialize:", err);
          setSdkStatus('Error en Registro ❌');
        }
      }

      // 3. Manejo de contexto de Iframe/Modal
      const urlParams = new URLSearchParams(window.location.search);
      const listId = urlParams.get('listId');
      
      if (listId) {
        setMode('modal');
        setListData({ id: listId, name: urlParams.get('listName') || 'Lista' });
        tRef.current = window.TrelloPowerUp.iframe();
      }
    } else {
      setSdkStatus('SDK de Trello NO ENCONTRADO ❌');
      console.error("❌ No se encontró window.TrelloPowerUp. Revisa el index.html");
    }
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
        const cleanName = card.name.replace(/^[\d\s.-]+/, '').trim();
        const newTitle = `${(i + 1).toString().padStart(2, '0')}. ${cleanName}`;
        
        setLog(prev => [...prev, `Actualizando -> ${newTitle}`]);
        setProgress(Math.round(((i + 1) / listCards.length) * 100));

        try {
          await t.set(card.id, 'shared', 'name', newTitle);
        } catch (e) {
          console.warn("Error de escritura en tarjeta", card.id);
        }
        await new Promise(r => setTimeout(r, 300));
      }

      setLog(prev => [...prev, '✅ ¡Listo!']);
      setTimeout(() => t.closeModal(), 1500);
    } catch (error) {
      setLog(prev => [...prev, '❌ Error de conexión.']);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- NOTIFICACIÓN FLOTANTE ---
  const Toast = () => (
    <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-700 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
      <div className="bg-blue-600 text-white px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(37,99,235,0.4)] flex items-center gap-4 border-2 border-white/20">
        <div className="bg-white text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold animate-bounce">!</div>
        <p className="font-black text-sm uppercase tracking-widest">Power-Up Activado Exitosamente</p>
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className="p-6 bg-white min-h-screen flex flex-col font-sans border-t-8 border-blue-600">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg italic">#</div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">Renumerar</h2>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{listData?.name}</p>
          </div>
        </div>

        {!isProcessing && progress === 0 ? (
          <button 
            onClick={runRenumbering}
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
          >
            <i className="fas fa-play"></i> COMENZAR AHORA
          </button>
        ) : (
          <div className="space-y-4">
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
              <div style={{ width: `${progress}%` }} className="h-full bg-blue-600 transition-all duration-300"></div>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 h-32 overflow-y-auto font-mono text-[10px] text-blue-300 border border-slate-700">
              {log.map((line, i) => <div key={i} className="mb-1">{line}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center font-sans">
      <Toast />
      
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 text-center space-y-8">
        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center text-white text-4xl shadow-2xl shadow-blue-200">
          <i className="fas fa-list-ol"></i>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Renumerar Pro</h1>
          <p className="text-slate-500 font-medium">Panel de Control del Power-Up</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
            <span className={`text-[10px] font-black px-2 py-1 rounded-md ${sdkStatus.includes('✅') ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {sdkStatus}
            </span>
          </div>
          <div className="text-xs font-mono text-slate-400 break-all bg-white p-3 rounded-lg border border-slate-200">
            {appUrl}
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); }}
            className="w-full py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
          >
            Probar Notificación Visual
          </button>
          <div className="text-[10px] text-slate-400 leading-relaxed px-4">
            Si ves el mensaje azul arriba, el código está funcionando. Si no ves el botón en Trello, revisa que <b>"List actions"</b> esté activado en el Portal de Trello.
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
