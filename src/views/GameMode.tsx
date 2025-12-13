
import React, { useState, useEffect, useRef } from 'react';
import { Student, Question } from '../types';
import { Users, Trophy, Play, CheckCircle, Volume2, VolumeX, Gamepad2, Loader2, RefreshCw, Zap, LogOut, Delete } from 'lucide-react';
import { speak, playBGM, stopBGM, playSFX, toggleMuteSystem } from '../utils/soundUtils';
import { supabase } from '../services/supabaseClient';

interface GameModeProps {
  student: Student;
  initialRoomCode?: string; 
  onExit: () => void;
  onFinish?: (score: number, total: number) => void;
}

type GameStatus = 'WAITING' | 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

const GameMode: React.FC<GameModeProps> = ({ student, initialRoomCode, onExit, onFinish }) => {
  const [status, setStatus] = useState<GameStatus>('WAITING');
  const [roomCode, setRoomCode] = useState<string>('');
  
  // New State for Keypad Input
  const [inputCode, setInputCode] = useState('');

  const [players, setPlayers] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [countdown, setCountdown] = useState(5);
  
  // Presence Score Tracking
  const [scores, setScores] = useState<any>({});
  const [myScore, setMyScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null); 
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const [isMuted, setIsMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const [timer, setTimer] = useState(0);
  const [maxTime, setMaxTime] = useState(20);
  
  // Check if admin by ID or by grade property set in App.tsx
  const isAdmin = student.id === '99999'; 
  const timerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // Refs for Listener Closure Safety (Fixes "Stale State" bugs)
  const statusRef = useRef(status);
  const questionsRef = useRef(questions);

  // Keep refs synced
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const getPlayerName = (name: any) => String(name || 'Player').split(' ')[0];

  // 1. Initial Room Setup
  useEffect(() => {
      if (initialRoomCode) {
          setRoomCode(initialRoomCode);
          setInputCode(initialRoomCode);
          connectToRoom(initialRoomCode);
      }
  }, [initialRoomCode]);

  // Audio Control
  const toggleSound = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    toggleMuteSystem(newState);
    if (!newState && status === 'PLAYING') playBGM('GAME');
  };

  const enableAudio = () => {
    setAudioEnabled(true);
    setIsMuted(false);
    toggleMuteSystem(false);
    playBGM('LOBBY'); 
    speak("สวัสดีครับ ยินดีต้อนรับสู่การแข่งขัน");
  };

  useEffect(() => {
    if (!audioEnabled) return;
    if (status === 'LOBBY') playBGM('LOBBY');
    else if (status === 'COUNTDOWN') { stopBGM(); playSFX('COUNTDOWN'); }
    else if (status === 'PLAYING') playBGM('GAME');
    else if (status === 'FINISHED') playBGM('VICTORY');
    return () => {};
  }, [status, audioEnabled]);

  useEffect(() => { return () => stopBGM(); }, []);

  // Keypad Handlers
  const handleNumberClick = (num: string) => {
    if (inputCode.length < 6) {
        setInputCode(prev => prev + num);
        setJoinError('');
    }
  };

  const handleBackspace = () => {
      setInputCode(prev => prev.slice(0, -1));
      setJoinError('');
  };

  const handleJoinRoom = () => {
      if(inputCode && inputCode.trim().length > 0) {
          setRoomCode(inputCode.trim());
          connectToRoom(inputCode.trim());
      }
  };

  // Reset function to go back to input code screen
  const handleBackToJoin = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      setRoomCode('');
      setInputCode('');
      setQuestions([]);
      setStatus('WAITING');
      setJoinError('');
      setIsJoining(false);
  };

  // --- SUPABASE REALTIME LOGIC ---

  const connectToRoom = async (code: string) => {
    setIsJoining(true);
    setJoinError('');
    
    // 1. Fetch Initial State from DB
    const { data: room, error } = await supabase.from('game_rooms').select('*').eq('room_code', code).single();
    
    if (error || !room) {
        setJoinError('ไม่พบห้องสอบ หรือรหัสผิด');
        setRoomCode('');
        setIsJoining(false);
        return;
    }

    // Set Initial State
    setStatus(room.status as GameStatus);
    setCurrentQuestionIndex(room.current_question_index);
    setTimer(room.timer);
    setMaxTime(room.time_per_question);
    
    // Safety check for questions
    if (room.questions && Array.isArray(room.questions)) {
        setQuestions(room.questions);
    }
    
    setIsJoining(false);
    
    // 2. Subscribe to Changes
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`game_${code}`, {
        config: { presence: { key: student.id } }
    });

    channelRef.current = channel;

    channel
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${code}` }, async (payload) => {
        const newRoom = payload.new;
        
        // Critical Fix: Use Ref to check stale questions state
        if (newRoom.status === 'PLAYING' && questionsRef.current.length === 0) {
            console.log("Missing questions, refetching...");
            const { data: refreshedRoom } = await supabase.from('game_rooms').select('*').eq('room_code', code).single();
            if (refreshedRoom?.questions) {
                setQuestions(refreshedRoom.questions);
            }
        }

        // Sync Status
        if (!isAdmin || statusRef.current !== newRoom.status) {
           setStatus(newRoom.status as GameStatus);
        }
        
        setCurrentQuestionIndex(newRoom.current_question_index);
        
        // Sync timer (Students only listen)
        if (!isAdmin) {
             setTimer(newRoom.timer);
        }
    })
    .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlinePlayers = Object.values(state).flat().map((p: any) => p.user);
        setPlayers(onlinePlayers);
        
        // Extract scores from presence
        const presenceScores: any = {};
        onlinePlayers.forEach((p: any) => {
            presenceScores[p.id] = p.score || 0;
        });
        setScores(presenceScores);
    })
    .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await channel.track({ 
                user: { id: student.id, name: student.name, avatar: student.avatar, score: myScore } 
            });
        }
    });
  };

  useEffect(() => {
      return () => {
          if (channelRef.current) supabase.removeChannel(channelRef.current);
      };
  }, []);

  // --- FALLBACK POLLING (SAFETY NET) ---
  // If websocket fails or packet is missed, this ensures students still sync the game state.
  useEffect(() => {
    // Only poll if connected and NOT Finished (to catch LOBBY -> COUNTDOWN -> PLAYING transitions)
    if (isAdmin || status === 'FINISHED' || !roomCode) return;
    
    const interval = setInterval(async () => {
        const { data } = await supabase.from('game_rooms').select('*').eq('room_code', roomCode).single();
        
        if (data) {
            // 1. Recover Status mismatch (e.g. Stuck in LOBBY or COUNTDOWN)
            if (data.status !== statusRef.current) {
                 // If switching to PLAYING and we don't have questions locally, force load them
                 if (data.status === 'PLAYING' && questionsRef.current.length === 0) {
                     if (data.questions && Array.isArray(data.questions)) {
                         setQuestions(data.questions);
                     }
                 }
                 setStatus(data.status as GameStatus);
            }
            
            // 2. Sync during PLAYING (in case socket missed current_question_index update)
            if (data.status === 'PLAYING') {
                 setCurrentQuestionIndex(prev => {
                     // Only update if different to avoid jitter
                     if (prev !== data.current_question_index) return data.current_question_index;
                     return prev;
                 });
                 // Sync timer loosely
                 if (Math.abs(data.timer - timer) > 2) {
                     setTimer(data.timer);
                 }
            }
        }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [status, isAdmin, roomCode, timer]);

  // --- GAME LOOP (ADMIN ONLY) ---
  useEffect(() => {
    if (!isAdmin || !roomCode || status === 'WAITING') return;
    
    if (timerRef.current) clearInterval(timerRef.current);

    if (status === 'COUNTDOWN') {
        let localCount = 5;
        setCountdown(localCount);
        // Reset DB Timer
        supabase.from('game_rooms').update({ timer: maxTime }).eq('room_code', roomCode).then();

        timerRef.current = setInterval(() => {
            localCount--;
            setCountdown(localCount);
            if (localCount <= 0) {
                clearInterval(timerRef.current);
                // Trigger PLAYING
                supabase.from('game_rooms').update({ status: 'PLAYING', timer: maxTime }).eq('room_code', roomCode).then();
                setStatus('PLAYING');
            }
        }, 1000);
    } else if (status === 'PLAYING') {
        let currentTimer = maxTime; 
        setTimer(currentTimer); // Local immediate update

        timerRef.current = setInterval(() => {
            currentTimer--;
            setTimer(currentTimer); // Update local for admin UI
            
            // Sync to DB every second (Admin is the timekeeper)
            if (currentTimer >= 0) {
                supabase.from('game_rooms').update({ timer: currentTimer }).eq('room_code', roomCode).then();
            }
            
            if (currentTimer < 0) {
                clearInterval(timerRef.current);
                if (currentQuestionIndex < questions.length - 1) {
                    supabase.from('game_rooms').update({
                        current_question_index: currentQuestionIndex + 1,
                        timer: maxTime,
                        status: 'PLAYING' // Refresh status to trigger clients
                    }).eq('room_code', roomCode).then();
                    
                    setCurrentQuestionIndex(prev => prev + 1);
                    setTimer(maxTime);
                } else {
                    supabase.from('game_rooms').update({ status: 'FINISHED', timer: 0 }).eq('room_code', roomCode).then();
                    setStatus('FINISHED');
                }
            }
        }, 1000);
    }

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, isAdmin, maxTime, currentQuestionIndex, questions.length, roomCode]);

  // Client Side Timer Animation (Approximate)
  useEffect(() => {
      if (!isAdmin && status === 'PLAYING') {
          // Just animate down locally for smooth UI, real sync happens via socket/polling
          const interval = setInterval(() => {
              setTimer(t => t > 0 ? t - 1 : 0);
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [status, currentQuestionIndex, maxTime, isAdmin]);

  // Client Side Visual Countdown
  useEffect(() => {
      if (!isAdmin && status === 'COUNTDOWN') {
          setCountdown(5);
          const interval = setInterval(() => {
              setCountdown(c => c > 0 ? c - 1 : 0);
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [status, isAdmin]);

  // Reset state on question change
  useEffect(() => {
     setHasAnswered(false);
     setSelectedChoice(null);
  }, [currentQuestionIndex]);

  // Update Presence Score when local score changes
  useEffect(() => {
      if (channelRef.current && status === 'PLAYING') {
          channelRef.current.track({ 
              user: { id: student.id, name: student.name, avatar: student.avatar, score: myScore } 
          });
      }
  }, [myScore]);

  const handleStartGame = async () => {
    if (!roomCode) return;
    const { error } = await supabase.from('game_rooms').update({ 
        status: 'COUNTDOWN'
    }).eq('room_code', roomCode);

    if (!error) {
        setStatus('COUNTDOWN');
    } else {
        alert("Error starting game: " + error.message);
    }
  };

  const handleReset = async () => {
    if (!roomCode) return;
    const { error } = await supabase.from('game_rooms').update({ 
        status: 'LOBBY', 
        current_question_index: 0, 
        timer: 0
    }).eq('room_code', roomCode);
    
    if (!error) {
        setStatus('LOBBY'); 
        setCurrentQuestionIndex(0);
        setCorrectCount(0);
        setMyScore(0);
    }
  };

  const normalizeId = (id: string | number) => String(id).trim().toLowerCase().replace('.', '');

  const handleAnswer = async (choiceId: string) => {
    if (hasAnswered || timer <= 0 || !roomCode) return;
    setHasAnswered(true);
    setSelectedChoice(choiceId); 

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    const normChoice = normalizeId(choiceId);
    const normCorrect = normalizeId(currentQ.correctChoiceId);
    
    // Check answer
    let isCorrect = normChoice === normCorrect;
    
    // Fallback index check
    if (!isCorrect) {
        const choiceIndex = currentQ.choices.findIndex(c => normalizeId(c.id) === normChoice);
        const correctIndex = parseInt(normCorrect);
        if (choiceIndex !== -1 && !isNaN(correctIndex) && (choiceIndex + 1) === correctIndex) {
            isCorrect = true;
        }
    }
    
    if (isCorrect) {
       setCorrectCount(prev => prev + 1);
       const timeBonus = Math.max(0, Math.round(50 * (timer / maxTime)));
       const points = 50 + timeBonus;
       playSFX('CORRECT'); 
       speak("เยี่ยมมาก");

       // Update Score Locally -> Effect will sync to Presence
       setMyScore(prev => prev + points);

    } else {
       playSFX('WRONG'); 
       speak("ยังไม่ถูก");
    }
  };

  const handleFinishAndExit = () => {
      if (status === 'FINISHED' && onFinish && !isAdmin) {
          onFinish(myScore, questions.length);
      } else {
          onExit();
      }
  };

  const sortedPlayers = players
    .filter(p => String(p.id) !== '99999')
    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    
  const currentQuestion = questions[currentQuestionIndex];

  // ---------- RENDERING (UI) ----------

  // 1. Waiting / Join Screen (Always visible if not connected/lobby)
  if (status === 'WAITING' && !isAdmin) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in pb-safe">
              <div className="bg-white p-6 rounded-[32px] shadow-2xl border-4 border-blue-100 w-full max-w-sm text-center relative overflow-hidden">
                  
                  {/* Decorative Header */}
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                      <div className="bg-blue-600 text-white p-4 rounded-full shadow-lg border-4 border-white">
                          <Gamepad2 size={32} />
                      </div>
                  </div>

                  <div className="mt-8 mb-4">
                      <h2 className="text-2xl font-black text-gray-800 font-fun">ใส่รหัสเข้าเกม</h2>
                      <p className="text-gray-400 text-xs">ขอรหัส 6 หลักจากคุณครู</p>
                  </div>
                  
                  {/* Code Display - High visibility */}
                  <div className="bg-gray-100 rounded-2xl py-4 px-2 mb-6 border-2 border-gray-200 flex justify-center items-center h-20 shadow-inner">
                      <span className={`font-mono text-4xl font-bold tracking-[0.3em] ${inputCode ? 'text-blue-600' : 'text-gray-300'}`}>
                          {inputCode.padEnd(6, '•')}
                      </span>
                  </div>

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-3 mb-6 px-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button key={num} onClick={() => handleNumberClick(num.toString())} className="bg-white border-b-4 border-gray-200 text-blue-600 active:border-b-0 active:translate-y-1 rounded-xl p-3 text-2xl font-bold hover:bg-blue-50 transition-all font-fun shadow-sm">
                        {num}
                        </button>
                    ))}
                    <div className="col-span-1"></div>
                    <button onClick={() => handleNumberClick('0')} className="bg-white border-b-4 border-gray-200 text-blue-600 active:border-b-0 active:translate-y-1 rounded-xl p-3 text-2xl font-bold hover:bg-blue-50 transition-all font-fun shadow-sm">0</button>
                    <button onClick={handleBackspace} className="bg-red-50 border-b-4 border-red-200 text-red-500 active:border-b-0 active:translate-y-1 rounded-xl p-3 text-xl font-bold hover:bg-red-100 transition-all shadow-sm flex items-center justify-center"><Delete size={28}/></button>
                  </div>

                  {joinError && <p className="text-red-500 mb-4 font-bold text-sm bg-red-50 p-2 rounded-lg animate-pulse">{joinError}</p>}
                  
                  <button 
                      onClick={handleJoinRoom}
                      disabled={isJoining || inputCode.length < 1}
                      className={`w-full text-white text-xl font-bold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all ${isJoining || inputCode.length < 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-[1.02] hover:shadow-blue-200'}`}
                  >
                      {isJoining ? <Loader2 className="animate-spin" /> : 'เข้าร่วมเลย!'}
                  </button>
                  
                  <button onClick={onExit} className="mt-4 text-gray-400 text-sm hover:text-red-500 font-bold px-4 py-2 rounded-lg w-full transition-colors">ยกเลิก / กลับหน้าหลัก</button>
              </div>
          </div>
      );
  }

  // 3. Lobby Screen
  if (status === 'LOBBY') {
    return (
      <div className="text-center py-10 min-h-[70vh] flex flex-col justify-center relative bg-gradient-to-b from-blue-50 to-white rounded-3xl border-4 border-blue-100 animate-fade-in">
        <button onClick={toggleSound} className={`absolute top-4 right-4 p-3 rounded-full shadow ${isMuted?'bg-gray-200':'bg-white'}`}>{isMuted?<VolumeX/>:<Volume2/>}</button>
        
        {isAdmin && (
            <div className="mb-6">
                <div className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">GAME PIN</div>
                <div className="text-5xl md:text-7xl font-black text-gray-800 tracking-widest font-mono bg-white inline-block px-8 py-4 rounded-3xl border-4 border-gray-100 shadow-xl">{roomCode}</div>
            </div>
        )}

        <h2 className="text-3xl font-black text-blue-900 mb-2 animate-bounce font-fun">🎮 ห้องพักนักกีฬา</h2>
        
        <div className="bg-white p-6 rounded-[32px] shadow-lg border-2 border-blue-50 max-w-3xl mx-auto w-full mb-8">
          <div className="text-xl font-bold text-blue-600 mb-6 flex justify-center gap-2 items-center"><Users className="bg-blue-100 p-1 rounded-md box-content"/> เพื่อนๆ ในห้อง ({sortedPlayers.length})</div>
          <div className="flex flex-wrap justify-center gap-4">
            {sortedPlayers.map((p: any, i) => (
              <div key={i} className="flex flex-col items-center animate-fade-in transform hover:scale-110 transition">
                  <div className="text-3xl bg-white w-14 h-14 rounded-full flex items-center justify-center border-4 border-blue-100 shadow-sm">{p.avatar}</div>
                  <span className="text-[10px] font-bold mt-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{getPlayerName(p.name)}</span>
              </div>
            ))}
            {sortedPlayers.length === 0 && <div className="text-gray-300 italic">รอเพื่อนๆ เข้ามา...</div>}
          </div>
        </div>
        
        {isAdmin ? <button onClick={handleStartGame} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-5 rounded-3xl text-2xl font-black shadow-xl hover:scale-105 transition mx-auto flex gap-3 border-b-8 border-emerald-700 active:border-b-0 active:translate-y-2"><Play fill="currentColor"/> เริ่มเกมเลย!</button> : <div className="animate-pulse text-white font-bold bg-blue-400 inline-block px-8 py-3 rounded-full shadow-lg shadow-blue-200">รอคุณครูกดเริ่มเกม...</div>}
        
        <button onClick={handleBackToJoin} className="text-gray-400 text-sm mt-8 hover:text-red-500 font-bold bg-gray-100 px-4 py-2 rounded-lg transition flex items-center gap-2 mx-auto">
            <LogOut size={16}/> ออกจากห้อง
        </button>
      </div>
    );
  }

  // 4. Countdown Screen
  if (status === 'COUNTDOWN') {
    return <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-3xl"><div className="text-2xl font-bold text-gray-400 mb-4 font-fun">เตรียมตัว...</div><div className="text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-purple-500 animate-ping drop-shadow-2xl">{countdown}</div></div>;
  }

  // 5. Playing Screen
  if (status === 'PLAYING') {
    const timePercent = (timer / maxTime) * 100;
    const timerColor = timePercent > 50 ? 'bg-green-500' : timePercent > 20 ? 'bg-yellow-500' : 'bg-red-600';
    
    if (isAdmin) {
        return (
            <div className="max-w-4xl mx-auto pt-4 pb-20 relative">
                <div className="flex justify-between items-center mb-6 bg-gray-900 text-white p-4 rounded-2xl shadow-lg">
                   <div className="flex items-center gap-4">
                       <div className="bg-white/10 px-3 py-1 rounded font-mono text-xl">{roomCode}</div>
                       <div className={`font-mono font-black text-4xl ${timer<=5?'text-red-400 animate-pulse':''}`}>{timer}</div>
                       <div className="text-sm opacity-80">ข้อที่ {currentQuestionIndex+1}/{questions.length}</div>
                   </div>
                   <div className="text-xl font-bold text-yellow-400">🏆 Live Ranking</div>
                   <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-xs font-bold">จบเกม</button>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-indigo-100">
                    <div className="bg-indigo-50 p-4 flex justify-between font-bold text-indigo-900 text-sm uppercase tracking-wider">
                        <span>อันดับ</span>
                        <span>ผู้เข้าแข่งขัน</span>
                        <span>คะแนน</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {sortedPlayers.map((p, i) => (
                            <div key={p.id} className={`flex items-center justify-between p-4 transition-all duration-700 ease-in-out transform translate-y-0 ${i===0?'bg-yellow-50 scale-[1.02] shadow-md z-10':i%2===0?'bg-white':'bg-gray-50'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-lg ${i===0?'bg-yellow-400 text-yellow-900':i===1?'bg-gray-300 text-gray-800':i===2?'bg-orange-300 text-orange-900':'bg-gray-200 text-gray-500'}`}>
                                        {i+1}
                                    </div>
                                    <span className="text-3xl">{p.avatar}</span>
                                    <span className="font-bold text-lg text-gray-800">{p.name}</span>
                                </div>
                                <span className="font-black text-2xl text-indigo-600">{scores[p.id]||0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    
    // Safety check: If in Playing mode but no questions, show loader and try to recover
    if (!currentQuestion) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                <h2 className="text-xl font-bold text-gray-800">กำลังโหลดโจทย์...</h2>
                <p className="text-gray-500 mb-6">หากรอนานเกินไป กรุณากดโหลดใหม่ หรือออกไปเข้าใหม่</p>
                <div className="flex gap-4">
                    <button onClick={() => connectToRoom(roomCode)} className="bg-blue-100 text-blue-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-200 transition">
                        <RefreshCw size={18}/> โหลดใหม่
                    </button>
                    <button onClick={handleBackToJoin} className="bg-red-100 text-red-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-200 transition">
                        <LogOut size={18}/> ออกไปเข้าใหม่
                    </button>
                </div>
            </div>
        );
    }

    return (
      <div className="max-w-4xl mx-auto pt-4 pb-20 relative">
        <button onClick={toggleSound} className={`fixed top-20 right-4 z-50 p-2 rounded-full shadow-lg ${isMuted ? 'bg-gray-200 text-gray-500' : 'bg-green-500 text-white animate-pulse'}`}>{isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}</button>
        
        <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-3xl shadow-md border-b-4 border-gray-200">
            <div className="flex flex-col items-center pl-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase">ข้อที่</span>
                <span className="font-black text-2xl text-blue-600">{currentQuestionIndex+1}<span className="text-sm text-gray-400 font-medium">/{questions.length}</span></span>
            </div>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative border border-gray-200 shadow-inner">
                <div className={`h-full transition-all duration-1000 ease-linear ${timerColor}`} style={{width:`${timePercent}%`}}></div>
            </div>
            <div className={`flex flex-col items-center pr-2 ${timer<=5?'animate-pulse':''}`}>
                <span className="text-[10px] text-gray-400 font-bold uppercase">เวลา</span>
                <span className={`font-black text-2xl ${timer<=5?'text-red-600':'text-gray-700'}`}>{timer}</span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border-b-8 border-blue-50 text-center relative overflow-hidden">
                    {timer <= 0 && <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm"><span className="bg-red-500 text-white px-8 py-4 rounded-full text-3xl font-black shadow-2xl animate-bounce border-4 border-white transform -rotate-3">หมดเวลา!</span></div>}
                    <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800 leading-relaxed font-fun">{currentQuestion.text}</h2>
                    {currentQuestion.image && <img src={currentQuestion.image} className="h-48 mx-auto object-contain mb-6 rounded-2xl border-2 border-gray-100 shadow-sm bg-gray-50"/>}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.choices.map((c, i) => {
                             let btnClass = ['bg-red-50 border-red-200 text-red-800 hover:bg-red-100','bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100','bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100','bg-green-50 border-green-200 text-green-800 hover:bg-green-100'][i%4];
                             const isSelected = selectedChoice === c.id;

                             if (hasAnswered || timer <= 0) {
                                 btnClass += ' opacity-60 grayscale cursor-not-allowed';
                                 const normId = normalizeId(c.id);
                                 const normCorrect = normalizeId(currentQuestion.correctChoiceId);
                                 let isThisCorrect = normId === normCorrect;
                                 if (isThisCorrect) {
                                     btnClass = 'bg-green-100 border-green-500 text-green-900 !opacity-100 !grayscale-0 ring-4 ring-green-200 shadow-lg';
                                 } else if (isSelected) {
                                     btnClass = 'bg-red-100 border-red-500 text-red-900 !opacity-100 !grayscale-0 ring-4 ring-red-200 shadow-lg';
                                 }
                             }
 
                             return (
                                <button key={c.id} onClick={()=>handleAnswer(c.id)} disabled={hasAnswered || timer<=0} className={`p-4 md:p-5 rounded-3xl font-bold text-lg border-b-8 relative overflow-hidden transition active:scale-95 active:border-b-0 active:translate-y-2 ${btnClass}`}>
                                    {c.text}
                                </button>
                             );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-b from-indigo-800 to-purple-900 rounded-[32px] p-5 shadow-2xl border-4 border-indigo-700 text-white h-fit">
                <h3 className="text-center font-black text-xl mb-4 flex items-center justify-center gap-2 uppercase tracking-wider text-yellow-400 drop-shadow-md font-fun">
                    <Trophy className="fill-yellow-400" /> คะแนนสูงสุด
                </h3>
                <div className="bg-white/10 p-3 rounded-2xl mb-4 flex justify-between items-center border border-white/20">
                    <span className="font-bold text-sm">คะแนนของฉัน</span>
                    <span className="font-black text-2xl text-yellow-400 animate-pulse">{myScore}</span>
                </div>
                
                <div className="space-y-3">
                    {sortedPlayers.slice(0, 5).map((p, i) => (
                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-2xl border-b-4 transition-all duration-500 ease-in-out transform ${i===0?'bg-yellow-400 border-yellow-600 text-yellow-900 scale-105 shadow-lg z-10':i===1?'bg-gray-200 border-gray-400 text-gray-800':i===2?'bg-orange-300 border-orange-600 text-orange-900':'bg-white/10 border-white/5 text-white'} ${p.id===student.id?'ring-4 ring-green-400':''}`}>
                            <div className="flex items-center gap-3">
                                <div className={`font-black text-xl w-8 h-8 flex items-center justify-center rounded-full ${i<3?'bg-white/30':'bg-black/20'}`}>{i+1}</div>
                                <span className="text-2xl">{p.avatar}</span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm truncate max-w-[80px]">{getPlayerName(p.name)}</span>
                                </div>
                            </div>
                            <span className="font-black text-xl">{scores[p.id]||0}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // 6. Finished Screen
  if (status === 'FINISHED') {
    return (
        <div className="max-w-4xl mx-auto py-10 animate-fade-in">
            <div className="text-center mb-10">
                <Trophy size={120} className="text-yellow-400 animate-bounce relative z-10 drop-shadow-2xl mx-auto"/>
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-600 mt-4 mb-2 font-fun">จบการแข่งขัน!</h1>
            </div>

            <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-blue-50 p-4 font-bold text-blue-800 flex justify-between px-8">
                    <span>อันดับ</span>
                    <span>ผู้เล่น</span>
                    <span>คะแนน</span>
                </div>
                <div className="divide-y divide-gray-100">
                    {sortedPlayers.map((p, idx) => (
                        <div key={p.id} className={`flex items-center justify-between p-4 px-8 hover:bg-blue-50 transition ${p.id===student.id ? 'bg-blue-50' : ''}`}>
                            <div className="flex items-center gap-6">
                                <span className="font-black text-xl text-gray-300 w-8">{idx + 1}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{p.avatar}</span>
                                    <span className={`font-bold ${p.id===student.id ? 'text-blue-600' : 'text-gray-700'}`}>{p.name} {p.id===student.id && '(ฉัน)'}</span>
                                </div>
                            </div>
                            <span className="font-black text-xl text-blue-600">{scores[p.id]||0}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-10 flex justify-center gap-4">
                <button onClick={handleFinishAndExit} className="bg-gray-100 text-gray-600 px-8 py-4 rounded-2xl font-bold hover:bg-gray-200 transition">กลับหน้าหลัก</button>
                {isAdmin && <button onClick={handleReset} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition">เริ่มเกมใหม่</button>}
            </div>
        </div>
    );
  }

  // Fallback Loader (Allows exit)
  return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <Loader2 className="animate-spin text-blue-600" size={48}/>
          <div className="text-center">
              <p className="text-xl font-bold text-gray-800 animate-pulse mb-2">กำลังเชื่อมต่อ...</p>
              <p className="text-gray-500">หากรอนานเกินไป กดปุ่มด้านล่างเพื่อลองใหม่</p>
          </div>
          <button onClick={handleBackToJoin} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold hover:bg-gray-300 transition flex items-center gap-2">
              <LogOut size={20}/> กลับไปหน้าใส่รหัส
          </button>
      </div>
  );
};

export default GameMode;
