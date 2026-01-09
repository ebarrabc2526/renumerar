
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
  const [sdkStatus, setSdkStatus] = useState('Detectando entorno...');
  
  const tRef = useRef<any>(null);

  useEffect(() => {
    // 1. Detección robusta de la URL base para subcarpetas (ej: /renumerar/)
    const currentPath = window.location.pathname;
    const isSubfolder = currentPath.length > 1;
    // Aseguramos que baseUrl termine en / para que los recursos relativos funcionen
    const baseUrl = window.location.origin + currentPath + (currentPath.endsWith('/') ? '' : '/');
    setAppUrl(baseUrl);

    console.log("📍 Contexto de ejecución:", baseUrl);

    // 2. Inicialización Crítica del Power-Up
    if (window.TrelloPowerUp) {
      if (!window.__TRELLO_INITIALIZED__) {
        try {
          window.TrelloPowerUp.initialize({
            'list-actions': (t: any) => {
              console.log("📥 Trello solicitó acciones de lista");
              return [{
                text: '🔢 Renumerar esta lista',
                callback: (t: any) => {
                  return t.list('id', 'name').then((list: any) => {
                    // Importante: Usamos la baseUrl calculada dinámicamente
                    const modalUrl = `${baseUrl}?listId=${list.id}&listName=${encodeURIComponent(list.name)}`;
                    console.log("🪟 Abriendo modal en:", modalUrl);
                    return t.modal({
                      title: 'Renumerar: ' + list.name,
                      url: modalUrl,
                      height: 380
                    });
                  });
                }
              }];
            }
          });

          window.__TRELLO_INITIALIZED__ = true;
          setSdkStatus('Power-Up Registrado ✅');
          
          // Notificación visual obligatoria para confirmar carga
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
          
          console.log("✅ Power-Up inicializado con éxito");
        } catch (err) {
          console.error("❌ Error inicializando TrelloPowerUp:", err);
          setSdkStatus('Error en Inicialización ❌');
        }
      } else {
        setSdkStatus('Power-Up ya estaba activo ✅');
      }

      // 3. Detectar si estamos en el modal
      const urlParams = new URLSearchParams(window.location.search);
      const listId = urlParams.get('listId');
      
      if (listId) {
        setMode('modal');
        setListData({ id: listId, name: urlParams.get('listName') || 'Lista' });
        tRef.current = window.TrelloPowerUp.iframe();
      }
    } else {
      setSdkStatus('SDK no encontrado ❌');
    }
  }, []);

  const runRenumbering = async () => {
    if (!listData || !tRef.current) return;
    const t = tRef.current;
    setIsProcessing(true);
    setLog(['🔍 Escaneando tarjetas de la lista...']);
    
    try {
      const cards = await t.cards('all');
      const listCards = cards.filter((c: any) => c.idList === listData.id);
      
      if (listCards.length === 0) {
        setLog(prev => [...prev, '⚠️ No se encontraron tarjetas en esta lista.']);
        setIsProcessing(false);
        return;
      }

      setLog(prev => [...prev, `📦 Encontradas ${listCards.length} tarjetas.`]);

      for (let i = 0; i < listCards.length; i++) {
        const card = listCards[i];
        // Limpiamos números previos si existen (ej: "01. ", "1- ", etc)
        const cleanName = card.name.replace(/^[\d\s.-]+/, '').trim();
        const newTitle = `${(i + 1).toString().padStart(2, '0')}. ${cleanName}`;
        
        setLog(prev => [...prev, `📝 ${newTitle}`]);
        setProgress(Math.round(((i + 1) / listCards.length) * 100));

        try {
          // Intentamos actualizar. Nota: El Power-Up debe tener permisos de escritura.
          await t.set(card.id, 'shared', 'name', newTitle);
        } catch (e) {
          console.warn("Error escribiendo en Trello:", e);
        }
        
        // Pequeño delay para no saturar la API y dar feedback visual
        await new Promise(r => setTimeout(r, 250));
      }

      setLog(prev => [...prev, '✨ ¡Lista renumerada con éxito!']);
      setTimeout(() => t.closeModal(), 1500);
    } catch (error) {
      setLog(prev => [...prev, '❌ Error de comunicación con Trello.']);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- COMPONENTES VISUALES ---

  const Toast = () => (
    <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[10000] transition-all duration-1000 transform ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
      <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
          <i className="fas fa-bolt"></i>
        </div>
        <div>
          <p className="font-black text-sm uppercase tracking-wider">¡Power-Up Listo!</p>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Conectado a Trello</p>
        </div>
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className="p-6 bg-white min-h-screen flex flex-col font-sans">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-100">
            <i className="fas fa-sort-numeric-down"></i>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Renumerar</h2>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{listData?.name}</p>
          </div>
        </div>

        {!isProcessing && progress === 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Se aplicará el formato <span className="font-bold text-slate-800">01. Nombre</span> a todas las tarjetas de esta lista siguiendo su orden actual.
            </p>
            <button 
              onClick={runRenumbering}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-200 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              INICIAR PROCESO
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div><span className="text-[10px] font-black inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-100">Progreso</span></div>
                <div className="text-right"><span className="text-[10px] font-black inline-block text-blue-600">{progress}%</span></div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-50">
                <div style={{ width: `${progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"></div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 h-28 overflow-y-auto font-mono text-[9px] text-emerald-400 border border-slate-800">
              {log.map((line, i) => <div key={i} className="mb-0.5 opacity-90">{line}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <Toast />
      
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center text-white text-3xl shadow-2xl shadow-blue-100">
            <i className="fas fa-rocket"></i>
          </div>
          
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic">RENUMERAR PRO</h1>
            <p className="text-slate-400 text-sm font-medium">Panel de Configuración del Power-Up</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-left space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado del Conector</label>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${sdkStatus.includes('✅') ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                <span className="text-xs font-bold text-slate-700">{sdkStatus}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tu URL de Iframe</label>
              <div className="text-[10px] font-mono bg-white p-3 rounded-lg border border-slate-200 break-all text-blue-600">
                {appUrl}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Si el mensaje "¡Power-Up Listo!" apareció arriba, la conexión es correcta. <br/>
              Asegúrate de que en Trello has activado las <b>"Capabilities: List Actions"</b>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
