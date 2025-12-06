import React, { useState, useEffect, useRef } from 'react';
import { Room, AppView, Participant } from './types';
import { getRoom, saveRoom, generateRoomCode, drawNames } from './services/roomService';
import { generateRoomTheme, generateRevealMessage } from './services/geminiService';
import { Snowfall } from './components/Snowfall';
import { Button } from './components/Button';

// --- ICONS ---
const UserIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const CogIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const GiftIcon = () => <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>;
const CheckIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>;
const LogoutIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

// --- SUB-COMPONENTS ---

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  participantName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  participantName: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-700 shadow-2xl p-6 text-center transform transition-all scale-100">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
           <UserIcon />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">¿Eres {participantName}?</h3>
        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
          Para proteger el secreto, confirma que eres tú. <br/>
          <span className="text-amber-500/80 text-xs mt-1 block">(Tu sesión se guardará en este dispositivo)</span>
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={onConfirm} className="flex-1">Sí, soy yo</Button>
        </div>
      </div>
    </div>
  );
};

const ExclusionModal = ({ 
  isOpen, 
  onClose, 
  participant, 
  allParticipants, 
  onToggle 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  participant: Participant | null; 
  allParticipants: Participant[]; 
  onToggle: (pid: string, eid: string) => void;
}) => {
  if (!isOpen || !participant) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-3xl max-w-md w-full border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-800 bg-slate-950/50">
          <h3 className="text-xl font-bold text-white mb-1">Exclusiones para {participant.name}</h3>
          <p className="text-slate-400 text-sm">Selecciona a quién {participant.name} <span className="text-red-400 font-bold">no puede</span> regalar.</p>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 space-y-2 pb-8">
          {allParticipants.length <= 1 && (
            <div className="text-center py-8 text-slate-500 italic">
              ¡Agrega más personas para establecer exclusiones!
            </div>
          )}
          {allParticipants.filter(p => p.id !== participant.id).map(p => {
             const isExcluded = participant.exclusions.includes(p.id);
             return (
              <button 
                key={p.id}
                onClick={() => onToggle(participant.id, p.id)}
                className={`w-full p-4 rounded-xl text-left transition-all flex items-center justify-between group border ${
                  isExcluded
                  ? 'bg-red-500/10 border-red-500/50 text-red-100'
                  : 'bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isExcluded ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{p.name}</span>
                </div>
                {isExcluded && <span className="text-xs font-bold uppercase tracking-wider bg-red-500 text-white px-2 py-1 rounded">Excluido</span>}
              </button>
             );
          })}
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <Button onClick={onClose} className="w-full">Listo</Button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [room, setRoom] = useState<Room | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  
  // Lobby State
  const [newName, setNewName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // General loading state
  const [drawError, setDrawError] = useState('');
  const [editingExclusionsId, setEditingExclusionsId] = useState<string | null>(null);

  // Reveal State
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [pendingParticipantId, setPendingParticipantId] = useState<string | null>(null);
  const [revealState, setRevealState] = useState<'idle' | 'shuffling' | 'revealed'>('idle');
  const [shuffledName, setShuffledName] = useState('');
  const [revealMessage, setRevealMessage] = useState('');
  const [revealTheme, setRevealTheme] = useState('');

  // Refs for animation
  const shuffleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash.length === 4) {
        handleJoin(hash);
      }
    } catch (e) {
      console.warn('Error reading location hash', e);
    }
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Polling logic to keep room state updated
  useEffect(() => {
    if (room && (view === AppView.LOBBY || view === AppView.DRAW_REVEAL)) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      
      pollingRef.current = setInterval(async () => {
        const fetched = await getRoom(room.id);
        if (fetched) {
          // Check if state changed from lobby to drawn to auto-redirect
          if (!room.isDrawn && fetched.isDrawn) {
            setView(AppView.DRAW_REVEAL);
          }
          setRoom(fetched);
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
       if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [room?.id, view]);

  // Auto-login / Persistence check
  useEffect(() => {
    if (room && view === AppView.DRAW_REVEAL) {
      const savedId = localStorage.getItem(`amigo_pid_${room.id}`);
      if (savedId && room.participants.find(p => p.id === savedId)) {
        setSelectedParticipantId(savedId);
      }
    }
  }, [room, view]);

  const safeSetHash = (hash: string) => {
    try {
      window.location.hash = hash;
    } catch (e) {
      console.warn('Error setting location hash:', e);
    }
  };

  const handleCreate = async () => {
    if (!newRoomName.trim()) return;
    setIsGenerating(true);
    
    const theme = await generateRoomTheme(newRoomName);
    
    const newRoom: Room = {
      id: generateRoomCode(),
      name: newRoomName,
      participants: [],
      assignments: [],
      isDrawn: false,
      theme: theme
    };
    
    const success = await saveRoom(newRoom);
    setIsGenerating(false);

    if (success) {
      setRoom(newRoom);
      setView(AppView.LOBBY);
      safeSetHash(newRoom.id);
    } else {
      alert("Error creando la sala. Inténtalo de nuevo.");
    }
  };

  const handleJoin = async (codeInput?: string) => {
    const code = codeInput || joinCode.toUpperCase();
    setIsLoading(true);
    const foundRoom = await getRoom(code);
    setIsLoading(false);

    if (foundRoom) {
      setRoom(foundRoom);
      if (foundRoom.isDrawn) {
        setView(AppView.DRAW_REVEAL);
      } else {
        setView(AppView.LOBBY);
      }
      if (!codeInput) {
        safeSetHash(code);
      }
      setJoinCode(''); // Clear input
    } else {
      if (!codeInput) alert("¡Sala no encontrada!");
    }
  };

  const handleAddParticipant = async () => {
    if (!newName.trim() || !room) return;
    setIsLoading(true);
    
    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      exclusions: []
    };

    const updatedRoom = {
      ...room,
      participants: [...room.participants, newParticipant]
    };

    const success = await saveRoom(updatedRoom);
    if (success) {
      setRoom(updatedRoom);
      setNewName('');
    } else {
      alert("Error guardando cambios.");
    }
    setIsLoading(false);
  };

  const handleRemoveParticipant = async (id: string) => {
    if (!room) return;
    const updatedRoom = {
      ...room,
      participants: room.participants.filter(p => p.id !== id).map(p => ({
        ...p,
        exclusions: p.exclusions.filter(exId => exId !== id)
      })),
    };

    await saveRoom(updatedRoom);
    setRoom(updatedRoom);
  };

  const handleToggleExclusion = async (participantId: string, excludeId: string) => {
    if (!room) return;
    const pIndex = room.participants.findIndex(p => p.id === participantId);
    if (pIndex === -1) return;

    const participant = room.participants[pIndex];
    let newExclusions = [...participant.exclusions];
    
    if (newExclusions.includes(excludeId)) {
      newExclusions = newExclusions.filter(id => id !== excludeId);
    } else {
      newExclusions.push(excludeId);
    }

    const updatedParticipants = [...room.participants];
    updatedParticipants[pIndex] = { ...participant, exclusions: newExclusions };
    
    const updatedRoom = { ...room, participants: updatedParticipants };
    await saveRoom(updatedRoom);
    setRoom(updatedRoom);
  };

  const handleDraw = async () => {
    if (!room) return;
    if (room.participants.length < 3) {
      setDrawError("¡Se necesitan al menos 3 participantes!");
      setTimeout(() => setDrawError(''), 3000);
      return;
    }
    
    setIsLoading(true);
    const assignments = drawNames(room.participants);
    
    if (!assignments) {
      setDrawError("¡Las exclusiones hacen esto imposible! Intenta eliminar algunas.");
      setIsLoading(false);
      return;
    }

    const updatedRoom = {
      ...room,
      assignments,
      isDrawn: true
    };
    
    const success = await saveRoom(updatedRoom);
    setIsLoading(false);
    
    if (success) {
      setRoom(updatedRoom);
      setView(AppView.DRAW_REVEAL);
    } else {
      setDrawError("Error guardando el sorteo. Intenta de nuevo.");
    }
  };

  const startRevealAnimation = async () => {
    if (!room || !selectedParticipantId) return;
    
    setRevealState('shuffling');
    setRevealMessage(''); // Clear previous
    setRevealTheme(room.theme);

    const assignment = room.assignments.find(a => a.giverId === selectedParticipantId);
    const receiver = room.participants.find(p => p.id === assignment?.receiverId);
    const giver = room.participants.find(p => p.id === selectedParticipantId);
    
    if (!receiver || !giver) return;

    // Start shuffling text
    const names = room.participants.filter(p => p.id !== selectedParticipantId).map(p => p.name);
    let shuffleCount = 0;
    
    // Get message
    const messagePromise = generateRevealMessage(giver.name, receiver.name, room.theme);

    if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
    
    shuffleIntervalRef.current = setInterval(() => {
      setShuffledName(names[Math.floor(Math.random() * names.length)]);
      shuffleCount++;
      
      // Stop after 2.5 seconds (approx 25 frames)
      if (shuffleCount > 25) {
        if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
        setShuffledName(receiver.name);
        setRevealState('revealed');
        
        // Load message
        messagePromise.then(msg => setRevealMessage(msg));
      }
    }, 80); // Fast shuffle
  };

  const handleCopyLink = () => {
    if (!room) return;
    try {
      const url = `${window.location.origin}${window.location.pathname}#${room.id}`;
      navigator.clipboard.writeText(url);
      alert("¡Enlace copiado al portapapeles!");
    } catch (e) {
      console.warn("Could not copy link", e);
      alert(`Código de sala: ${room.id}`);
    }
  };

  const resetToLanding = () => {
     setView(AppView.LANDING);
     setRoom(null);
     safeSetHash('');
     setJoinCode('');
  };

  const handleRestart = async () => {
     if(!room) return;
     if(confirm('¿Estás seguro? Esto borrará todas las asignaciones y abrirá el lobby de nuevo.')) {
       const updated = { ...room, isDrawn: false, assignments: [] };
       setIsLoading(true);
       await saveRoom(updated);
       setIsLoading(false);
       setRoom(updated);
       setView(AppView.LOBBY);
     }
  };

  const handleConfirmIdentity = () => {
    if (!pendingParticipantId || !room) return;
    localStorage.setItem(`amigo_pid_${room.id}`, pendingParticipantId);
    setSelectedParticipantId(pendingParticipantId);
    setRevealState('idle');
    setPendingParticipantId(null);
  };

  const handleLogout = () => {
    if (!room) return;
    localStorage.removeItem(`amigo_pid_${room.id}`);
    setSelectedParticipantId(null);
    setRevealState('idle');
  };

  // --- VIEW RENDERS ---

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 relative z-10 animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-16">
        <h1 className="font-festive text-7xl md:text-9xl text-amber-500 drop-shadow-lg mb-2 transform -rotate-2">
          Amigo Invisible
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Create Side */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-xl hover:border-amber-500/30 transition-all group">
           <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 text-amber-500 group-hover:scale-110 transition-transform">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">Crear Nuevo Grupo</h2>
           <p className="text-slate-400 mb-6 text-sm">Inicia un nuevo intercambio, establece exclusiones y sortea nombres al instante.</p>
           
           <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="ej. Fiesta de Oficina 2025"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
           />
           <Button onClick={handleCreate} isLoading={isGenerating} disabled={!newRoomName.trim()} className="w-full">
             Crear Grupo
           </Button>
        </div>

        {/* Join Side */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-xl hover:border-amber-500/30 transition-all group">
           <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">Unirse a Existente</h2>
           <p className="text-slate-400 mb-6 text-sm">Ingresa el código de 4 caracteres compartido por el organizador.</p>
           
           <div className="relative mb-4">
             <input 
                type="text" 
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700 placeholder:tracking-normal placeholder:text-base"
             />
           </div>
           <Button 
             onClick={() => handleJoin()} 
             isLoading={isLoading}
             variant="secondary" 
             className="w-full"
             disabled={joinCode.length !== 4}
           >
             Entrar a la Sala
           </Button>
        </div>
      </div>
    </div>
  );

  const renderLobby = () => {
    if (!room) return null;
    return (
      <>
        <div className="max-w-2xl mx-auto p-4 md:p-8 relative z-10 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-sm font-mono mb-4 cursor-pointer hover:bg-slate-700 transition-colors" onClick={handleCopyLink}>
               <span>CÓDIGO:</span>
               <span className="text-white font-bold tracking-widest">{room.id}</span>
               <svg className="w-3 h-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{room.name}</h1>
            <p className="text-amber-500/80 font-festive text-2xl">"{room.theme}"</p>
          </div>

          {/* Input */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-2 flex gap-2 shadow-lg border border-slate-700 mb-8">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
              placeholder="Escribe un nombre para agregar..."
              className="flex-1 bg-transparent border-none text-white px-4 focus:ring-0 focus:outline-none placeholder-slate-500"
            />
            <Button onClick={handleAddParticipant} disabled={!newName.trim() || isLoading} isLoading={isLoading} className="rounded-xl py-2 px-6">
              Agregar
            </Button>
          </div>

          {/* List */}
          <div className="space-y-3 mb-8">
             {room.participants.length === 0 && (
               <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
                 Aún no hay participantes. ¡Agrégate a ti mismo y a tus amigos!
               </div>
             )}
             {room.participants.map(p => (
               <div key={p.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-slate-600 transition-all">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 font-bold shadow-inner">
                     {p.name.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <div className="font-bold text-white">{p.name}</div>
                     {p.exclusions.length > 0 && (
                       <div className="text-xs text-red-400 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                         Excluye a {p.exclusions.length} personas
                       </div>
                     )}
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setEditingExclusionsId(p.id)}
                     className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${p.exclusions.length > 0 ? 'text-amber-400 bg-amber-400/10' : 'text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700'}`}
                     title="Gestionar Exclusiones"
                   >
                     <CogIcon />
                     <span className="hidden sm:inline">Exclusiones</span>
                   </button>
                   <button 
                     onClick={() => handleRemoveParticipant(p.id)}
                     className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                   >
                     <TrashIcon />
                   </button>
                 </div>
               </div>
             ))}
          </div>
          
          {drawError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-center text-sm animate-pulse">
              {drawError}
            </div>
          )}
        </div>

        {/* Footer Action - Moved outside the animated container to fix fixed positioning contexts */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 to-transparent pt-12 z-20 flex justify-center animate-in fade-in duration-1000">
           <Button 
             className="w-full max-w-md shadow-2xl shadow-amber-500/20 text-lg py-4"
             onClick={handleDraw}
             isLoading={isLoading}
             disabled={room.participants.length < 3}
           >
             Sortear Nombres 🎲
           </Button>
        </div>
      </>
    );
  };

  const renderRevealList = () => (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <header className="mb-12 text-center">
        <h1 className="font-festive text-5xl md:text-6xl text-white mb-4">¡El Sorteo está Completo!</h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Los nombres han sido mezclados y asignados. Busca tu nombre abajo para revelar tu pareja secreta.
        </p>
      </header>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {room?.participants.map(p => (
          <button
            key={p.id}
            onClick={() => setPendingParticipantId(p.id)}
            className="group relative bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 p-6 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-slate-700 group-hover:bg-amber-500 text-slate-300 group-hover:text-slate-900 transition-colors flex items-center justify-center text-2xl font-bold shadow-lg">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-white group-hover:text-amber-400 transition-colors truncate w-full text-center">
              {p.name}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-slate-600 text-sm mb-2">Herramientas de Organizador</p>
        <button 
          onClick={handleRestart}
          className="text-slate-500 hover:text-red-400 text-sm underline transition-colors"
        >
          Reiniciar Sorteo
        </button>
      </div>
    </div>
  );

  const renderSingleReveal = () => {
    const me = room?.participants.find(p => p.id === selectedParticipantId);
    if (!me) return null;

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] w-full p-4 relative animate-in fade-in zoom-in duration-300">
        <button 
          onClick={handleLogout}
          className="absolute top-4 left-4 md:top-8 md:left-8 text-slate-500 hover:text-red-400 flex items-center gap-2 px-4 py-2 rounded-full hover:bg-red-500/10 transition-all text-sm font-medium"
        >
          <LogoutIcon />
          <span>No soy {me.name}</span>
        </button>

        <div className="text-center mb-10">
          <div className="text-amber-500 font-festive text-3xl mb-2">Hola,</div>
          <h1 className="text-5xl font-bold text-white mb-2">{me.name}</h1>
          {revealState === 'idle' && (
             <p className="text-slate-400">Tu pareja te espera dentro...</p>
          )}
        </div>

        {revealState === 'idle' && (
          <button 
             onClick={startRevealAnimation}
             className="group relative w-64 h-64 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl shadow-2xl shadow-orange-500/20 flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 hover:rotate-1"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 rounded-3xl"></div>
             <GiftIcon />
             <span className="mt-4 font-bold text-slate-900 text-lg uppercase tracking-wider">Toca para Revelar</span>
             <div className="absolute inset-0 rounded-3xl ring-4 ring-white/20 group-hover:ring-white/40 transition-all"></div>
          </button>
        )}

        {revealState === 'shuffling' && (
           <div className="w-64 h-64 flex flex-col items-center justify-center">
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 animate-pulse">
                {shuffledName}
              </div>
              <div className="mt-4 text-slate-500 text-sm uppercase tracking-widest animate-pulse">
                Mezclando...
              </div>
           </div>
        )}

        {revealState === 'revealed' && (
          <div className="w-full max-w-md perspective animate-in zoom-in duration-500">
             <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-red-500 to-green-400"></div>
                
                <p className="text-slate-400 text-sm uppercase tracking-widest mb-4">Eres el Amigo Invisible de</p>
                <h2 className="text-5xl md:text-6xl font-black text-white mb-8 drop-shadow-lg">{shuffledName}</h2>
                
                <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800">
                   {revealMessage ? (
                     <p className="text-amber-100 font-festive text-2xl leading-relaxed">"{revealMessage}"</p>
                   ) : (
                     <div className="flex justify-center gap-1">
                       <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"></span>
                       <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-100"></span>
                       <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-200"></span>
                     </div>
                   )}
                </div>
                
                <div className="mt-6 text-xs text-slate-500">
                   {revealTheme}
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen relative font-sans">
      <Snowfall />
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 bg-slate-950 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80"></div>
        {view === AppView.LANDING && (
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        )}
      </div>

      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none">
         <div className="pointer-events-auto cursor-pointer" onClick={resetToLanding}>
            <span className="text-2xl opacity-80 hover:opacity-100 transition-opacity">🎄</span>
         </div>
      </nav>

      <main className="relative z-10 w-full min-h-screen flex flex-col">
        {view === AppView.LANDING && renderLanding()}
        {view === AppView.LOBBY && renderLobby()}
        {view === AppView.DRAW_REVEAL && (!selectedParticipantId ? renderRevealList() : renderSingleReveal())}

        <ExclusionModal 
          isOpen={!!editingExclusionsId}
          onClose={() => setEditingExclusionsId(null)}
          participant={room?.participants.find(p => p.id === editingExclusionsId) || null}
          allParticipants={room?.participants || []}
          onToggle={handleToggleExclusion}
        />
        
        <ConfirmationModal 
          isOpen={!!pendingParticipantId}
          onClose={() => setPendingParticipantId(null)}
          onConfirm={handleConfirmIdentity}
          participantName={room?.participants.find(p => p.id === pendingParticipantId)?.name || ''}
        />
      </main>
    </div>
  );
};

export default App;