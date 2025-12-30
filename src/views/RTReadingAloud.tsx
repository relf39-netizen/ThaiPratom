
import React, { useState, useEffect, useRef } from 'react';
import { RTReadingItem, Student } from '../types';
import { 
    ArrowLeft, Volume2, Star, CheckCircle2, Loader2, AlertCircle, 
    Mic, MicOff, Sparkles, RefreshCw, ChevronRight 
} from 'lucide-react';
import { getRTReadingData, saveRTResult } from '../services/api';
import { evaluateReading, ReadingEvaluation } from '../services/aiService';
import { speak, playSFX, stopSpeaking } from '../utils/soundUtils';

interface RTReadingAloudProps {
  student: Student;
  onBack: () => void;
  onUpdateStars: (newStars: number) => void;
}

const RTReadingAloud: React.FC<RTReadingAloudProps> = ({ student, onBack, onUpdateStars }) => {
  const [items, setItems] = useState<RTReadingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentType, setCurrentType] = useState<'WORD' | 'SENTENCE' | 'PASSAGE'>('WORD');
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(true);

  // 🎙️ Recording & Attempt States
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluation, setEvaluation] = useState<ReadingEvaluation | null>(null);
  const [attempts, setAttempts] = useState(0); // นับจำนวนครั้งที่อ่านผิดในข้อนี้

  const recognitionRef = useRef<any>(null);
  const autoNextTimeoutRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('');
        setEvaluation(null);
        if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
      };

      recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        setTranscript(result);
        handleAnalyzeReading(result);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsRecording(false);
        if (event.error === 'no-speech') {
            const msg = "พี่นกฮูกไม่ได้ยินเสียงหนูเลยจ้ะ ลองกดปุ่มไมค์สีฟ้าแล้วพูดใหม่อีกทีนะจ๊ะ";
            setEvaluation({
                isCorrect: false,
                feedback: "ไม่ได้ยินเสียงจ้ะ",
                encouragement: "ลองอีกครั้งนะ"
            });
            speak(msg);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    };
  }, [currentIndex]);

  const fetchItems = async (type: 'WORD' | 'SENTENCE' | 'PASSAGE') => {
    setLoading(true);
    setCurrentType(type);
    setItems([]);
    setEvaluation(null);
    setAttempts(0);
    try {
        const data = await getRTReadingData(student.school || 'Admin School', type);
        
        if (!data || data.length === 0) {
            const msg = "ไม่พบข้อมูลคำศัพท์จ้ะ กรุณาแจ้งคุณครูนะจ๊ะ";
            speak(msg);
            alert(msg);
            setShowModeSelection(true);
            return;
        }

        const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, 10);
        setItems(shuffled);
        setCurrentIndex(0);
        setIsFinished(false);
        setShowModeSelection(false);
        speak(`เริ่มฝึกอ่านหมวด ${type === 'WORD' ? 'คำศัพท์' : type === 'SENTENCE' ? 'ประโยค' : 'ข้อความ'} จ้ะ ตั้งใจฟังและอ่านตามนะจ๊ะ`);
    } catch (e) {
        speak("เกิดข้อผิดพลาดจ้ะ ลองใหม่อีกครั้งนะ");
    } finally {
        setLoading(false);
    }
  };

  const handleStartRecording = () => {
    stopSpeaking();
    if (recognitionRef.current && !isRecording && !isAnalyzing) {
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error(e);
        }
    }
  };

  const handleAnalyzeReading = async (text: string) => {
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    setIsAnalyzing(true);
    try {
        const result = await evaluateReading(currentItem.text, text, process.env.API_KEY || '');
        setEvaluation(result);

        if (result.isCorrect) {
            playSFX('CORRECT');
            setAttempts(0); // Reset attempts
            
            // AI ชมเชย
            speak(result.encouragement || "เก่งมากจ้ะ อ่านถูกต้องแล้ว!");
            
            // บันทึกคะแนนอัตโนมัติ
            await recordScore();

            // รอ 2.5 วินาทีให้เด็กฟังคำชมจบแล้วไปข้อต่อไปอัตโนมัติ
            autoNextTimeoutRef.current = setTimeout(() => {
                moveToNext();
            }, 2500);
            
        } else {
            playSFX('WRONG');
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts < 3) {
                // ยังไม่ถึง 3 ครั้ง ให้ลองใหม่
                const retryMsg = "ยังไม่ถูกจ้ะ ลองอ่านใหม่อีกครั้งนะจ๊ะ";
                speak(retryMsg);
                setEvaluation({
                    ...result,
                    encouragement: "ลองใหม่อีกครั้งนะ (ครั้งที่ " + newAttempts + "/3)"
                });
            } else {
                // ครบ 3 ครั้งแล้ว เฉลยให้ฟัง
                const solvedMsg = `ยังไม่ถูกจ้ะ แต่ไม่เป็นไรนะ คำอ่านที่ถูกต้องคือ ${currentItem.text} จ้ะ ลองดูข้อต่อไปนะ`;
                speak(solvedMsg);
                setEvaluation({
                    ...result,
                    feedback: "ฝึกฝนต่อไปนะจ๊ะ",
                    encouragement: "คำอ่านที่ถูกต้องคือ: " + currentItem.text
                });

                // ไปข้อต่อไปหลังจากเฉลยจบ
                autoNextTimeoutRef.current = setTimeout(() => {
                    moveToNext();
                }, 5000);
            }
        }
    } catch (err) {
        console.error(err);
        speak("พี่นกฮูกขอโทษจ้ะ ตรวจสอบไม่ได้ ลองใหม่อีกทีนะ");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const recordScore = async () => {
    const item = items[currentIndex];
    if (!item || isSaving) return;
    setIsSaving(true);
    try {
        const success = await saveRTResult(student.id, item.id, 1);
        if (success) {
            onUpdateStars(student.stars + 1);
        }
    } catch (err) {
        console.error("Save RT Result Error", err);
    }
    setIsSaving(false);
  };

  const moveToNext = () => {
    setEvaluation(null);
    setTranscript('');
    setAttempts(0);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // อ่านคำต่อไปให้ฟังเลยเพื่อนำทาง
      setTimeout(() => {
        const nextItem = items[currentIndex + 1];
        if (nextItem) speak(`ข้อต่อไป คำนี้อ่านว่าอะไรจ๊ะ?`);
      }, 500);
    } else {
      setIsFinished(true);
      speak("เก่งที่สุดเลยจ้ะ ภารกิจสำเร็จแล้ว! ไปดูดาวที่หนูได้กันเถอะจ้ะ");
    }
  };

  const handleSpeakTarget = () => {
    const textToRead = items[currentIndex]?.text;
    if (textToRead) {
      speak("ฟังพี่นกฮูกนะจ๊ะ... " + textToRead);
    }
  };

  if (showModeSelection) {
      return (
          <div className="max-w-4xl mx-auto animate-fade-in pb-10">
              <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-black mb-6 hover:text-pink-500 transition-colors">
                  <ArrowLeft size={20}/> กลับหน้าหลัก
              </button>
              <div className="text-center mb-10">
                  <div className="text-8xl mb-4 animate-bounce">🦉</div>
                  <h2 className="text-3xl font-black text-gray-800 font-fun">เลือกโหมดการฝึกอ่านนะจ๊ะ</h2>
                  <p className="text-gray-400 font-bold mt-2">สะสมดาว 1 ดวง ต่อ 1 คำที่อ่านถูกจ้ะ!</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                  <button onClick={() => fetchItems('WORD')} className="group p-10 bg-orange-50 rounded-[40px] border-4 border-orange-200 font-black text-2xl hover:scale-105 hover:bg-orange-100 transition shadow-lg text-orange-700 flex flex-col items-center gap-3">
                      <span className="text-5xl group-hover:rotate-12 transition-transform">📝</span>
                      อ่านเป็นคำ
                  </button>
                  <button onClick={() => fetchItems('SENTENCE')} className="group p-10 bg-sky-50 rounded-[40px] border-4 border-sky-200 font-black text-2xl hover:scale-105 hover:bg-sky-100 transition shadow-lg text-sky-700 flex flex-col items-center gap-3">
                      <span className="text-5xl group-hover:rotate-12 transition-transform">💬</span>
                      อ่านประโยค
                  </button>
                  <button onClick={() => fetchItems('PASSAGE')} className="group p-10 bg-emerald-50 rounded-[40px] border-4 border-emerald-200 font-black text-2xl hover:scale-105 hover:bg-emerald-100 transition shadow-lg text-emerald-700 flex flex-col items-center gap-3">
                      <span className="text-5xl group-hover:rotate-12 transition-transform">📖</span>
                      อ่านข้อความ
                  </button>
              </div>
          </div>
      );
  }

  if (loading) return (
      <div className="flex flex-col items-center justify-center py-20 text-sky-500">
          <Loader2 className="animate-spin mb-4" size={64} />
          <p className="font-black text-2xl font-fun">กำลังเตรียมคำศัพท์นะจ๊ะ...</p>
      </div>
  );

  if (isFinished) {
      return (
          <div className="max-w-2xl mx-auto text-center py-10 animate-fade-in px-4">
              <div className="bg-white rounded-[50px] p-10 shadow-2xl border-8 border-yellow-100">
                  <div className="text-9xl mb-6">🎉</div>
                  <h2 className="text-4xl font-black text-gray-800 font-fun mb-6">สุดยอดไปเลย!</h2>
                  <div className="bg-yellow-50 rounded-3xl p-6 mb-10 flex items-center justify-center gap-4 border-2 border-yellow-200">
                      <Star className="text-yellow-400 fill-yellow-400" size={48}/>
                      <span className="text-5xl font-black text-yellow-600">+{items.length}</span>
                  </div>
                  <button onClick={() => setShowModeSelection(true)} className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-xl shadow-xl hover:bg-sky-600 hover:-translate-y-1 transition active:scale-95">ฝึกหมวดอื่นต่อ</button>
              </div>
          </div>
      );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 animate-fade-in">
      <div className="bg-white rounded-[50px] p-8 md:p-12 shadow-2xl text-center border-b-[16px] border-sky-100 relative overflow-hidden">
          
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-sky-50 px-4 py-1 rounded-full text-sm font-black text-sky-600 border border-sky-100 shadow-sm">
              คำที่ {currentIndex + 1} จาก {items.length}
          </div>
          
          {/* 🦉 Mascot & Speech Bubble Area */}
          <div className="flex flex-col items-center mb-6 mt-6 min-h-[160px]">
              <div className="relative">
                  <div className={`text-[100px] transition-transform duration-500 ${isRecording ? 'scale-110 drop-shadow-xl' : evaluation?.isCorrect ? 'animate-bounce' : ''}`}>
                    {evaluation?.isCorrect ? '🦉💖' : isRecording ? '🦉🎧' : (attempts > 0 ? '🦉🧐' : '🦉')}
                  </div>
                  
                  {/* Feedback Bubble */}
                  {(evaluation || isRecording || isAnalyzing) && (
                      <div className="absolute -top-16 -right-32 md:-right-48 w-44 md:w-64 bg-white p-4 rounded-3xl shadow-2xl border-4 border-sky-100 animate-fade-in z-10">
                          <div className="absolute -bottom-3 left-4 w-6 h-6 bg-white border-b-4 border-r-4 border-sky-100 rotate-45"></div>
                          {isAnalyzing ? (
                              <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                                  <RefreshCw className="animate-spin" size={18}/> พี่นกฮูกกำลังตรวจ...
                              </div>
                          ) : isRecording ? (
                              <div className="text-orange-500 font-bold text-sm flex items-center gap-2">
                                  <div className="flex gap-1">
                                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                  </div>
                                  กำลังฟังหนูอยู่จ้ะ...
                              </div>
                          ) : (
                              <div className="space-y-1">
                                  <p className={`text-base font-black ${evaluation?.isCorrect ? 'text-green-600' : 'text-orange-500'}`}>
                                      {evaluation?.isCorrect ? 'เก่งมากจ้ะ!' : (attempts >= 3 ? 'เฉลยจ้ะ' : 'เกือบถูกแล้วจ้ะ')}
                                  </p>
                                  <p className="text-xs text-gray-500 font-bold leading-tight">{evaluation?.encouragement}</p>
                                  {evaluation?.phoneticHelp && attempts < 3 && <p className="text-xs text-blue-600 font-black">ใบ้ให้: {evaluation.phoneticHelp}</p>}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {/* Target Text Area */}
          <div className="mb-10 min-h-[140px] flex flex-col justify-center">
              <h1 className={`font-fun font-black text-gray-800 break-words leading-tight ${currentType === 'WORD' ? 'text-7xl md:text-9xl' : 'text-4xl md:text-6xl'}`}>
                  {currentItem?.text}
              </h1>
              {transcript && (
                  <div className="mt-6 flex flex-col items-center animate-fade-in">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">เสียงที่หนูพูด</span>
                      <span className="text-xl font-black text-sky-600 bg-sky-50 px-6 py-2 rounded-2xl border-2 border-sky-100 shadow-sm">"{transcript}"</span>
                  </div>
              )}
          </div>

          {/* Controls Area */}
          <div className="space-y-8 max-w-2xl mx-auto">
              
              {/* Main Interaction: Recording Button */}
              <div className="flex justify-center">
                  <div className="relative">
                    {!isRecording && !isAnalyzing && !evaluation?.isCorrect && (
                         <div className="absolute inset-0 bg-sky-400 rounded-full animate-ping opacity-20"></div>
                    )}
                    
                    <button 
                        onClick={handleStartRecording}
                        disabled={isRecording || isAnalyzing || evaluation?.isCorrect}
                        className={`relative group w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 z-10
                            ${isRecording 
                                ? 'bg-red-500 text-white' 
                                : isAnalyzing 
                                    ? 'bg-gray-100 text-gray-400' 
                                    : evaluation?.isCorrect
                                        ? 'bg-emerald-100 text-emerald-600 border-4 border-emerald-400'
                                        : 'bg-gradient-to-br from-sky-400 to-blue-600 text-white hover:scale-105'
                            }
                        `}
                    >
                        {isRecording && (
                            <>
                                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></div>
                                <div className="absolute inset-[-15px] rounded-full bg-red-400 animate-pulse opacity-20"></div>
                            </>
                        )}

                        {isRecording ? <MicOff size={56} /> : isAnalyzing ? <Loader2 className="animate-spin" size={56} /> : evaluation?.isCorrect ? <CheckCircle2 size={56}/> : <Mic size={56} />}
                        
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            <span className="text-sm font-black text-gray-600 bg-white/80 px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                                {isRecording ? 'กำลังฟัง...' : isAnalyzing ? 'กำลังตรวจ...' : evaluation?.isCorrect ? 'ถูกต้องแล้วจ้ะ!' : (attempts > 0 ? `ลองใหม่อีกทีจ้ะ (${attempts}/3)` : 'กดแล้วเริ่มอ่านเลยจ้ะ')}
                            </span>
                        </div>
                    </button>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16 pt-4 border-t-2 border-dashed border-gray-100">
                  <button 
                    onClick={handleSpeakTarget} 
                    disabled={isRecording || isAnalyzing}
                    className="py-5 bg-white border-4 border-sky-200 text-sky-600 rounded-[32px] font-black text-xl shadow-lg flex items-center justify-center gap-2 hover:bg-sky-50 transition active:scale-95 disabled:opacity-50"
                  >
                    <Volume2 size={28}/> ฟังพี่นกฮูกเฉลย
                  </button>
                  
                  <button 
                    onClick={moveToNext} 
                    disabled={isSaving} 
                    className={`py-5 text-white rounded-[32px] font-black text-xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95
                        ${evaluation?.isCorrect 
                            ? 'bg-emerald-500 hover:bg-emerald-600 ring-4 ring-emerald-100 scale-105' 
                            : 'bg-gray-400 hover:bg-gray-500'
                        }
                    `}
                  >
                      {isSaving ? <Loader2 className="animate-spin"/> : <>ไปข้อต่อไป <ChevronRight size={28}/></>}
                  </button>
              </div>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-6">
              <button onClick={() => setShowModeSelection(true)} className="text-gray-400 font-bold hover:text-gray-600 underline text-sm transition-colors">เลือกหมวดอ่านใหม่</button>
              <button onClick={onBack} className="text-gray-400 font-bold hover:text-red-500 underline text-sm transition-colors">ออกจากการฝึก</button>
          </div>
      </div>
    </div>
  );
};

export default RTReadingAloud;
