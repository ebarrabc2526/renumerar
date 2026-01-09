
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
  const [sdkStatus, setSdkStatus] = useState('Sincronizando...');
  
  const tRef = useRef<any>(null);

  useEffect(() => {
    // Cálculo infalible de la URL base del directorio actual
    // Esto extrae la carpeta actual eliminando el nombre del archivo (como index.html) y los parámetros
    const baseUrl = window.location.href.split('?')[0].split('#')[0].replace(/[^\/]*$/, '');
    setAppUrl(baseUrl);

    console.log("🛠️ App cargada en carpeta:", baseUrl);

    if (window.TrelloPowerUp) {
      if (!window.__TRELLO_INITIALIZED__) {
        try {
          window.TrelloPowerUp.initialize({
            'list-actions': (t: any) => {
              return [{
                text: '🔢 Renumerar tarjetas',
                callback: (t: any) => {
                  return t.list('id', 'name').then((list: any) => {
                    // Generamos la URL del modal usando la base detectada
                    const modalUrl = `${baseUrl}index.html?listId=${list.id}&listName=${encodeURIComponent(list.name)}`;
                    console.log("🚀 Lanzando modal Trello:", modalUrl);
                    return t.modal({
                      title: 'Ordenando: ' + list.name,
                      url: modalUrl,
                      height: 380
                    });
                  });
                }
              }];
            }
          });
          window.__TRELLO_INITIALIZED__ = true;
          setSdkStatus('Conectado a Trello ✅');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        } catch (err) {
          setSdkStatus('Error de inicialización ❌');
        }
      }

      // Lógica de Iframe (cuando estamos dentro del modal de Trello)
      const urlParams = new URLSearchParams(window.location.search);
      const listId = urlParams.get('listId');
      if (listId) {
        setMode('modal');
        setListData({ id: listId, name: urlParams.get('listName') || 'Lista' });
        tRef.current = window.TrelloPowerUp.iframe();
      }
    } else {
      setSdkStatus('SDK no detectado ❌');
    }
  }, []);

  const runRenumbering = async () => {
    if (!listData || !tRef.current) return;
    const t = tRef.current;
    setIsProcessing(true);
    setLog(['🚀 Iniciando proceso...']);
    
    try {
      const cards = await t.cards('all');
      const listCards = cards.filter((c: any) => c.idList === listData.id);
      
      if (listCards.length === 0) {
        setLog(prev => [...prev, '⚠️ No hay tarjetas para procesar.']);
        setIsProcessing(false);
        return;
      }

      for (let i = 0; i < listCards.length; i++) {
        const card = listCards[i];
        const cleanName = card.name.replace(/^[\d\s.-]+/, '').trim();
        const newTitle = `${(i + 1).toString().padStart(2, '0')}. ${cleanName}`;
        
        setLog(prev => [...prev, `Actualizando: ${newTitle}`]);
        setProgress(Math.round(((i + 1) / listCards.length) * 100));

        try {
          await t.set(card.id, 'shared', 'name', newTitle);
        } catch (e) {
          console.error("Error en tarjeta:", card.id);
        }
        await new Promise(r => setTimeout(r, 200));
      }

      setLog(prev => [...prev, '✅ ¡Completado!']);
      setTimeout(() => t.closeModal(), 1200);
    } catch (error) {
      setLog(prev => [...prev, '❌ Error de comunicación.']);
    } finally {
      setIsProcessing(false);
    }
  };

  if (mode === 'modal') {
    return (
      <div className="p-6 bg-white min-h-screen font-sans border-t-4 border-blue-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <i className="fas fa-list-ol text-lg"></i>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Renumerar Lista</h2>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-70">{listData?.name}</p>
          </div>
        </div>

        {!isProcessing && progress === 0 ? (
          <button onClick={runRenumbering} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95">
            REORDENAR AHORA
          </button>
        ) : (
          <div className="space-y-4">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div style={{ width: `${progress}%` }} className="h-full bg-blue-600 transition-all duration-300"></div>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] text-blue-300">
              {log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      {showToast && (
        <div className="fixed top-10 animate-bounce bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm">
          🚀 Power-Up Listo
        </div>
      )}
      
      <div className="max-w-sm w-full bg-white rounded-[2rem] shadow-xl p-8 text-center space-y-6 border border-slate-100">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl shadow-xl shadow-blue-100">
          <i className="fas fa-check"></i>
        </div>
        
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">CONFIGURACIÓN</h1>
          <p className="text-slate-400 text-xs font-medium">Estado del Conector Iframe</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 text-left space-y-3">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sdkStatus.includes('✅') ? 'bg-green-500' : 'bg-blue-500'}`}></span>
              {sdkStatus}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ruta Base Detectada</p>
            <p className="text-[10px] font-mono text-blue-600 break-all bg-white p-2 rounded border border-slate-200">
              {appUrl || 'Detectando...'}
            </p>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 px-4">
          Si la ruta base arriba incluye <b>/renumerar/</b>, el Power-Up funcionará correctamente en Trello.
        </p>
      </div>
    </div>
  );
};

export default App;
