
import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Volume2, Loader2, Star } from 'lucide-react';
import { speak } from '../utils/soundUtils';

interface PracticeModeProps {
  onFinish: (score: number, total: number) => void;
  onBack: () => void;
  questions: Question[]; // รับคำถามเข้ามาจาก Google Sheet
}

const PracticeMode: React.FC<PracticeModeProps> = ({ onFinish, onBack, questions: allQuestions }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const choiceLabels = ['A', 'B', 'C', 'D']; 
  const normalizeId = (id: any) => String(id).trim();

  useEffect(() => {
    // กระบวนการเตรียมข้อสอบ: สุ่มโจทย์ + ตัดเหลือ 10 ข้อ + สลับช้อยส์ + Sanitize IDs
    if (allQuestions && allQuestions.length > 0) {
        setLoading(true);

        // 1. สุ่มลำดับโจทย์ทั้งหมดก่อน (Shuffle Questions)
        const shuffledQuestions = [...allQuestions].sort(() => 0.5 - Math.random());

        // 2. ตัดมาแค่ 10 ข้อ
        const limitedQuestions = shuffledQuestions.slice(0, 10);

        // 3. ตรวจสอบ ID และสลับตำแหน่งตัวเลือก (Shuffle Choices)
        const finalQuestions = limitedQuestions.map(q => {
            // Ensure choices have valid IDs
            const safeChoices = q.choices.map((c, idx) => ({
                ...c,
                id: c.id ? normalizeId(c.id) : `gen_choice_${idx}`
            }));

            // Normalize Correct Choice ID
            let correctId = normalizeId(q.correctChoiceId);
            
            // ตรวจสอบว่า ID เฉลยมีอยู่ในตัวเลือกหรือไม่
            const exists = safeChoices.some(c => c.id === correctId);

            if (!exists) {
                // พยายาม Mapping จาก Index หรือ ตัวอักษร
                const numeric = parseInt(correctId);
                if (!isNaN(numeric) && numeric >= 1 && numeric <= safeChoices.length) {
                    correctId = safeChoices[numeric - 1].id;
                } else {
                    const map: Record<string, number> = { 
                        'A':0, 'B':1, 'C':2, 'D':3, 
                        'a':0, 'b':1, 'c':2, 'd':3,
                        'ก':0, 'ข':1, 'ค':2, 'ง':3 
                    };
                    const key = correctId.toUpperCase().replace('.', '');
                    if (map[key] !== undefined && map[key] < safeChoices.length) {
                         correctId = safeChoices[map[key]].id;
                    } else if (safeChoices.length > 0) {
                        // Fallback: ถ้าหาไม่เจอจริงๆ ให้ใช้ข้อแรกเป็นข้อถูก (กัน Error)
                        correctId = safeChoices[0].id;
                        console.warn(`Question ID ${q.id} has invalid correctChoiceId: ${q.correctChoiceId}. Defaulting to first choice.`);
                    }
                }
            }

            // Shuffle choices
            const shuffledChoices = [...safeChoices].sort(() => 0.5 - Math.random());

            return {
                ...q,
                choices: shuffledChoices,
                correctChoiceId: correctId
            };
        });

        setQuestions(finalQuestions);
        setLoading(false);
    } else {
        setLoading(false); 
    }
  }, [allQuestions]);

  const currentQuestion = questions[currentIndex];

  const handleChoiceSelect = (choiceId: string) => {
    if (isSubmitted) return;
    setSelectedChoice(choiceId);
    // Optional: Play a small "pop" sound here if needed
  };

  const handleSubmit = () => {
    if (!selectedChoice) return;
    
    const isCorrect = selectedChoice === currentQuestion.correctChoiceId;
    setIsSubmitted(true);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      speak("ถูกต้องครับ เก่งมาก");
    } else {
      speak("ยังไม่ถูก ไม่เป็นไรครับ ดูเฉลยกัน");
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedChoice(null);
      setIsSubmitted(false);
    } else {
      onFinish(score, questions.length);
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col justify-center items-center h-[60vh] text-blue-500">
            <Loader2 className="animate-spin mb-4" size={48}/>
            <p className="font-bold text-xl animate-pulse">กำลังเตรียมชุดข้อสอบ...</p>
        </div>
    );
  }

  if (questions.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
            <p className="text-xl font-bold mb-4">ไม่พบข้อมูลข้อสอบ</p>
            <button onClick={onBack} className="bg-blue-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 transition">กลับหน้าหลัก</button>
        </div>
    );
  }

  // ชุดสีสำหรับปุ่มตัวเลือก
  const choiceColors = [
    { 
      base: 'bg-sky-50 border-sky-200 text-sky-800', 
      hover: 'hover:bg-sky-100 hover:border-sky-300 hover:-translate-y-1', 
      selected: 'bg-sky-100 border-sky-500 ring-2 ring-sky-300 shadow-md scale-[1.02]' 
    },
    { 
      base: 'bg-emerald-50 border-emerald-200 text-emerald-800', 
      hover: 'hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-1', 
      selected: 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-300 shadow-md scale-[1.02]' 
    },
    { 
      base: 'bg-amber-50 border-amber-200 text-amber-800', 
      hover: 'hover:bg-amber-100 hover:border-amber-300 hover:-translate-y-1', 
      selected: 'bg-amber-100 border-amber-500 ring-2 ring-amber-300 shadow-md scale-[1.02]' 
    },
    { 
      base: 'bg-rose-50 border-rose-200 text-rose-800', 
      hover: 'hover:bg-rose-100 hover:border-rose-300 hover:-translate-y-1', 
      selected: 'bg-rose-100 border-rose-500 ring-2 ring-rose-300 shadow-md scale-[1.02]' 
    }
  ];

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft size={20} /> ออก
        </button>
        <div className="flex-1 mx-4 bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          ></div>
        </div>
        <span className="font-bold text-gray-600 text-sm">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-[32px] shadow-lg p-6 md:p-8 mb-6 border-b-4 border-gray-200 relative overflow-hidden">
        <div className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
          {currentQuestion.subject}
        </div>
        
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 leading-relaxed font-fun">
          {currentQuestion.text}
        </h2>

        {currentQuestion.image && (
          <div className="mb-6 rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50">
            <img src={currentQuestion.image} alt="Question" className="w-full h-auto object-contain max-h-60" />
          </div>
        )}

        <div className="space-y-3">
          {currentQuestion.choices.map((choice, index) => {
            const colorTheme = choiceColors[index % 4];
            const label = choiceLabels[index] || (index + 1).toString();
            
            let buttonStyle = `border-2 shadow-sm transition-all duration-200 relative flex items-center gap-4 ${colorTheme.base} ${colorTheme.hover}`;
            let badgeStyle = "bg-white border-2 border-white/50 text-gray-500";

            if (selectedChoice === choice.id) {
              buttonStyle = `border-2 shadow-md font-bold ${colorTheme.selected}`;
              badgeStyle = "bg-white text-blue-600 border-blue-200 shadow-inner";
            }

            if (isSubmitted) {
              if (choice.id === currentQuestion.correctChoiceId) {
                buttonStyle = "border-2 border-green-500 bg-green-100 text-green-900 shadow-md scale-[1.02] !opacity-100";
                badgeStyle = "bg-green-500 text-white border-transparent";
              } else if (choice.id === selectedChoice) {
                buttonStyle = "border-2 border-red-500 bg-red-100 text-red-900 opacity-80";
                badgeStyle = "bg-red-500 text-white border-transparent";
              } else {
                buttonStyle = "border-2 border-gray-100 bg-gray-50 text-gray-400 opacity-40 grayscale";
                badgeStyle = "bg-gray-200 text-gray-400";
              }
            }

            return (
              <button
                key={choice.id}
                onClick={() => handleChoiceSelect(choice.id)}
                disabled={isSubmitted}
                className={`w-full p-3 md:p-4 rounded-3xl text-left text-lg ${buttonStyle} active:scale-95`}
              >
                {/* Label Circle A, B, C, D */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${badgeStyle}`}>
                   {label}
                </div>

                <div className="flex-1">
                  {choice.image ? (
                     <div className="flex items-center gap-3 w-full">
                        <img src={choice.image} alt="choice" className="w-16 h-16 rounded object-cover border bg-white" />
                        <span className="font-medium">{choice.text}</span>
                     </div>
                  ) : (
                     <span className="font-medium">{choice.text}</span>
                  )}
                </div>

                {/* Star Icon when Selected (Before Submit) */}
                {!isSubmitted && selectedChoice === choice.id && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 animate-bounce">
                    <Star className="text-yellow-400 fill-yellow-400 drop-shadow-sm" size={32} />
                  </div>
                )}

                {isSubmitted && choice.id === currentQuestion.correctChoiceId && (
                  <CheckCircle className="text-green-600 absolute right-4 drop-shadow-sm" size={28} />
                )}
                {isSubmitted && choice.id === selectedChoice && choice.id !== currentQuestion.correctChoiceId && (
                  <XCircle className="text-red-500 absolute right-4 drop-shadow-sm" size={28} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-gray-200 md:static md:bg-transparent md:border-0 md:p-0 z-20">
        <div className="max-w-3xl mx-auto">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedChoice}
              className={`w-full py-4 rounded-2xl font-bold text-xl shadow-lg transition-all transform active:scale-95 ${
                selectedChoice 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200 hover:from-blue-600 hover:to-blue-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              ส่งคำตอบ
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 animate-fade-in shadow-sm relative">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-green-800 flex items-center gap-2 text-lg">
                    <CheckCircle size={24} /> เฉลย
                    </h3>
                    <button 
                        onClick={() => speak(currentQuestion.explanation)}
                        className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-full transition-colors flex items-center gap-1 text-sm font-bold pr-3"
                    >
                        <Volume2 size={20} /> ฟังคำอธิบาย
                    </button>
                </div>
                <p className="text-green-800 text-base leading-relaxed pl-1">{currentQuestion.explanation}</p>
              </div>
              <button
                onClick={handleNext}
                className="w-full py-4 rounded-2xl font-bold text-xl shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-blue-200 active:scale-95"
              >
                {currentIndex < questions.length - 1 ? 'ข้อต่อไป' : 'ดูผลลัพธ์'} <ArrowRight size={24} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeMode;
