
import React, { useState, useEffect, useRef } from 'react';
import { RTReadingItem, Student } from '../types';
import { 
    ArrowLeft, Volume2, Star, CheckCircle2, Loader2, AlertCircle, 
    Mic, MicOff, Sparkles, MessageCircle, RefreshCw 
} from 'lucide-react';
import { getRTReadingData, saveRTResult } from '../services/api';
import { evaluateReading, ReadingEvaluation } from '../services/aiService';
import { speak, playSFX } from '../utils/soundUtils';

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

  // 🎙️ Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluation, setEvaluation] = useState<ReadingEvaluation | null>(null);

  const recognitionRef = useRef<any>(null);

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
            setEvaluation({
                isCorrect: false,
                feedback: "พี่นกฮูกไม่ได้ยินเสียงหนูเลยจ้ะ",
                encouragement: "ลองกดปุ่มไมค์แล้วพูดใหม่นะจ๊ะ!"
            });
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
        if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [currentIndex]);

  const fetchItems = async (type: 'WORD' | 'SENTENCE' | 'PASSAGE') => {
    setLoading(true);
    setCurrentType(type);
    setItems([]);
    setEvaluation(null);
    try {
        const data = await getRTReadingData(student.school || 'Admin School', type);
        
        if (!data || data.length === 0) {
            alert(`ไม่พบข้อมูลคำศัพท์ในหมวดนี้จ้ะ\nกรุณาเพิ่มข้อมูลใน "เมนูครู > เตรียมสอบ RT" ก่อนนะจ๊ะ`);
            setShowModeSelection(true);
            return;
        }

        const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, 10);
        setItems(shuffled);
        setCurrentIndex(0);
        setIsFinished(false);
        setShowModeSelection(false);
        speak(`เริ่มฝึกอ่านหมวด ${type === 'WORD' ? 'คำศัพท์' : type === 'SENTENCE' ? 'ประโยค' : 'ข้อความ'} จ้ะ`);
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
        setLoading(false);
    }
  };

  const handleStartRecording = () => {
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
            speak(result.encouragement);
        } else {
            playSFX('WRONG');
            speak(result.feedback + " " + result.encouragement);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleNext = async () => {
    if (isSaving || items.length === 0 || !items[currentIndex]) return;
    
    setIsSaving(true);
    const item = items[currentIndex];
    
    try {
        const success = await saveRTResult(student.id, item.id, 1);
        if (success) {
            onUpdateStars(student.stars + 1);
        }
    } catch (err) {
        console.error("Save RT Result Error", err);
    }
    
    setIsSaving(false);
    setEvaluation(null);
    setTranscript('');
    
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      speak("เก่งที่สุดเลยจ้ะ ภารกิจสำเร็จแล้ว!");
    }
  };

  const handleSpeakTarget = () => {
    const textToRead = items[currentIndex]?.text;
    if (textToRead) {
      speak(textToRead);
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
                  <p className="text-gray-400 font-bold mt-2">หนูอยากอ่านแบบไหนดีจ๊ะ?</p>
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

  if (!currentItem && !loading) {
      return (
          <div className="max-w-md mx-auto text-center py-20 bg-white rounded-3xl shadow-lg border-2 border-red-100 p-8">
              <AlertCircle size={64} className="mx-auto text-red-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">ข้อมูลยังไม่พร้อมจ้ะ</h2>
              <button onClick={() => setShowModeSelection(true)} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">กลับไปเลือกโหมด</button>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 animate-fade-in">
      <div className="bg-white rounded-[50px] p-8 md:p-12 shadow-2xl text-center border-b-[16px] border-sky-100 relative overflow-hidden">
          
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-sky-50 px-4 py-1 rounded-full text-sm font-black text-sky-600 border border-sky-100 shadow-sm">
              ข้อที่ {currentIndex + 1} จาก {items.length}
          </div>
          
          {/* 🦉 Mascot & Speech Bubble Area */}
          <div className="flex flex-col items-center mb-10 mt-6 min-h-[160px]">
              <div className="relative group">
                  <div className={`text-[100px] transition-transform duration-500 ${isRecording ? 'scale-110' : evaluation?.isCorrect ? 'animate-bounce' : ''}`}>
                    {evaluation?.isCorrect ? '🦉💖' : isRecording ? '🦉🎧' : '🦉'}
                  </div>
                  
                  {/* Feedback Bubble */}
                  {(evaluation || isRecording || isAnalyzing) && (
                      <div className="absolute -top-12 -right-32 md:-right-48 w-40 md:w-56 bg-white p-4 rounded-3xl shadow-xl border-2 border-sky-100 animate-fade-in z-10">
                          <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white border-b-2 border-r-2 border-sky-100 rotate-45"></div>
                          {isAnalyzing ? (
                              <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                                  <RefreshCw className="animate-spin" size={16}/> พี่นกฮูกกำลังตรวจ...
                              </div>
                          ) : isRecording ? (
                              <div className="text-orange-500 font-bold text-sm flex items-center gap-2">
                                  <div className="flex gap-1">
                                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                  </div>
                                  พี่นกฮูกกำลังฟังจ้ะ...
                              </div>
                          ) : (
                              <div className="space-y-1">
                                  <p className={`text-sm font-black ${evaluation?.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                      {evaluation?.isCorrect ? 'เก่งมากจ้ะ!' : 'ลองใหม่นะจ๊ะ'}
                                  </p>
                                  <p className="text-xs text-gray-500 font-bold leading-tight">{evaluation?.encouragement}</p>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {/* Target Text Area */}
          <div className="mb-10">
              <h1 className={`font-fun font-black text-gray-800 break-words leading-tight ${currentType === 'WORD' ? 'text-7xl md:text-9xl' : 'text-4xl md:text-6xl'}`}>
                  {currentItem?.text}
              </h1>
              {transcript && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="text-sm font-bold text-gray-400 uppercase">ที่หนูพูด:</span>
                      <span className="text-lg font-black text-sky-600 bg-sky-50 px-4 py-1 rounded-full">{transcript}</span>
                  </div>
              )}
          </div>

          {/* Controls Area */}
          <div className="space-y-6 max-w-2xl mx-auto">
              
              {/* Main Interaction: Recording Button */}
              <div className="flex justify-center mb-4">
                  <button 
                    onClick={handleStartRecording}
                    disabled={isRecording || isAnalyzing}
                    className={`relative group w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95
                        ${isRecording 
                            ? 'bg-red-500 text-white' 
                            : isAnalyzing 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-gradient-to-br from-sky-400 to-blue-600 text-white hover:scale-105'
                        }
                    `}
                  >
                      {/* Wave Effect when Recording */}
                      {isRecording && (
                          <>
                              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></div>
                              <div className="absolute inset-[-10px] rounded-full bg-red-400 animate-pulse opacity-20"></div>
                          </>
                      )}

                      {isRecording ? <MicOff size={48} /> : isAnalyzing ? <Loader2 className="animate-spin" size={48} /> : <Mic size={48} />}
                      
                      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                          <span className="text-sm font-black text-gray-600">
                              {isRecording ? 'กำลังฟัง...' : isAnalyzing ? 'กำลังตรวจ...' : 'กดแล้วอ่านให้ฟังหน่อยจ้ะ'}
                          </span>
                      </div>
                  </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                  <button 
                    onClick={handleSpeakTarget} 
                    className="py-5 bg-white border-4 border-sky-200 text-sky-600 rounded-[32px] font-black text-xl shadow-lg flex items-center justify-center gap-2 hover:bg-sky-50 transition active:scale-95"
                  >
                    <Volume2 size={28}/> ฟังตัวอย่างจ้ะ
                  </button>
                  
                  <button 
                    onClick={handleNext} 
                    disabled={isSaving || !evaluation?.isCorrect} 
                    className={`py-5 text-white rounded-[32px] font-black text-xl shadow-xl flex items-center justify-center gap-2 transition active:scale-95
                        ${evaluation?.isCorrect 
                            ? 'bg-emerald-500 hover:bg-emerald-600' 
                            : 'bg-gray-300 cursor-not-allowed'
                        }
                    `}
                  >
                      {isSaving ? <Loader2 className="animate-spin"/> : evaluation?.isCorrect ? <><CheckCircle2 size={28}/> ข้อต่อไปจ้ะ</> : <><Sparkles size={28}/> อ่านให้ถูกเพื่อไปต่อนะ</>}
                  </button>
              </div>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-6">
              <button onClick={() => setShowModeSelection(true)} className="text-gray-400 font-bold hover:text-gray-600 underline text-sm transition-colors">เปลี่ยนโหมดการอ่าน</button>
              <button onClick={onBack} className="text-gray-400 font-bold hover:text-red-500 underline text-sm transition-colors">ออกจากการฝึก</button>
          </div>
      </div>
    </div>
  );
};

export default RTReadingAloud;
