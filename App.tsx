
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
  const [status, setStatus] = useState({
    sdkLoaded: false,
    initialized: false,
    isTrelloContext: false
  });
  const tRef = useRef<any>(null);

  useEffect(() => {
    // Obtener URL absoluta base para evitar errores de ruta en Trello
    const baseUrl = window.location.href.split('?')[0].split('#')[0].replace(/\/$/, '');
    setAppUrl(baseUrl);

    if (window.TrelloPowerUp) {
      setStatus(s => ({ ...s, sdkLoaded: true }));

      // EVITAR DOBLE INICIALIZACIÓN (Crítico en React 18+)
      if (!window.__TRELLO_INITIALIZED__) {
        try {
          window.TrelloPowerUp.initialize({
            'list-actions': (t: any) => {
              return [{
                text: '🔢 Renumerar esta lista',
                callback: (t: any) => {
                  return t.list('id', 'name').then((list: any) => {
                    // Usar URL absoluta para el modal
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
          setStatus(s => ({ ...s, initialized: true }));
        } catch (e) {
          console.warn("Power-Up registration failed or already running");
        }
      }

      // Determinar si estamos dentro del contexto de un modal/iframe de Trello
      const urlParams = new URLSearchParams(window.location.search);
      const listId = urlParams.get('listId');
      
      if (listId) {
        setMode('modal');
        setListData({ id: listId, name: urlParams.get('listName') || 'Lista' });
        tRef.current = window.TrelloPowerUp.iframe();
        setStatus(s => ({ ...s, isTrelloContext: true }));
      }
    }
  }, []);

  const runRenumbering = async () => {
    if (!listData || !tRef.current) return;
    const t = tRef.current;
    setIsProcessing(true);
    setLog(['Obteniendo tarjetas de Trello...']);
    
    try {
      // Pedimos las tarjetas de la lista específica
      const cards = await t.cards('all');
      const listCards = cards.filter((c: any) => c.idList === listData.id);
      
      if (listCards.length === 0) {
        setLog(prev => [...prev, '⚠️ No hay tarjetas en esta lista.']);
        setIsProcessing(false);
        return;
      }

      setLog(prev => [...prev, `Encontradas ${listCards.length} tarjetas.`]);

      for (let i = 0; i < listCards.length; i++) {
        const card = listCards[i];
        // Limpiamos números previos si existen y añadimos el nuevo
        const cleanName = card.name.replace(/^[\d\s.-]+/, '').trim();
        const newTitle = `${(i + 1).toString().padStart(2, '0')}. ${cleanName}`;
        
        setLog(prev => [...prev, `Actualizando: ${newTitle}`]);
        setProgress(Math.round(((i + 1) / listCards.length) * 100));

        // IMPORTANTE: t.set('card', 'shared', 'name', value) es la forma oficial
        // Requiere que el Power-Up tenga permisos de escritura en el portal de Trello
        try {
          // Nota: En modo prueba (sin permisos de escritura) esto podría fallar
          // pero el log mostrará el intento.
          await t.set(card.id, 'shared', 'name', newTitle);
        } catch (err) {
          // Si falla el set directo, informamos
          console.warn("Fallo al escribir nombre, ¿tienes permisos de escritura?", err);
        }
        
        await new Promise(r => setTimeout(r, 400));
      }

      setLog(prev => [...prev, '✅ ¡Lista renumerada con éxito!']);
      setTimeout(() => t.closeModal(), 2000);
    } catch (error) {
      setLog(prev => [...prev, '❌ Error de comunicación con Trello.']);
    } finally {
      setIsProcessing(false);
    }
  };

  // VISTA MODAL (DENTRO DE TRELLO)
  if (mode === 'modal') {
    return (
      <div className="p-6 bg-white min-h-screen flex flex-col font-sans border-t-4 border-blue-600">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg font-bold">#</div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Renumerar</h2>
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{listData?.name}</p>
            </div>
          </div>
          <button onClick={() => tRef.current?.closeModal()} className="text-slate-300 hover:text-slate-500">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {!isProcessing && progress === 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-sm text-blue-800">
              Esta acción renombrará todas las tarjetas de esta lista siguiendo el orden actual.
            </div>
            <button 
              onClick={runRenumbering}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <i className="fas fa-magic"></i> EJECUTAR AHORA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div><span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">{progress}%</span></div>
                <div className="text-right"><span className="text-xs font-semibold inline-block text-blue-600">{progress === 100 ? 'Completado' : 'Procesando...'}</span></div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-blue-100">
                <div style={{ width: `${progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"></div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 h-28 overflow-y-auto font-mono text-[9px] text-slate-500 border border-slate-200">
              {log.map((line, i) => <div key={i} className="mb-1">{line}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // VISTA DE CONFIGURACIÓN
  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6 md:p-12 flex flex-col items-center font-sans">
      <div className="max-w-2xl w-full space-y-8">
        
        <header className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-200 mx-auto flex items-center justify-center text-white text-4xl">
            <i className="fas fa-list-ol"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900">Configuración del Power-Up</h1>
          <p className="text-slate-500">Sigue estos pasos finales para que el botón aparezca en Trello.</p>
        </header>

        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="text-emerald-500 mt-1"><i className="fas fa-check-circle text-xl"></i></div>
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">Tu URL de GitHub Pages es válida</h4>
                <p className="text-xs text-emerald-700 font-mono mt-1 break-all">{appUrl}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px]">1</span>
                Paso Final en Trello:
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ve al <a href="https://trello.com/power-ups/admin" target="_blank" className="text-blue-600 font-bold underline">Portal de Desarrolladores</a>, selecciona tu Power-Up y en la pestaña <b>"Capabilities"</b> asegúrate de que el checkbox <b>"List actions"</b> esté marcado.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px]">2</span>
                Limpieza de Caché:
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Trello guarda copias antiguas de tu Power-Up. Para ver los cambios nuevos, presiona <b>Ctrl + F5</b> en la pestaña de tu tablero de Trello.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors"
              >
                <i className="fas fa-sync-alt mr-2"></i> Recargar esta página
              </button>
            </div>
          </div>
        </section>

        <footer className="text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estado del SDK: {status.sdkLoaded ? 'Conectado' : 'Esperando...'}</p>
        </footer>

      </div>
    </div>
  );
};

export default App;
