
import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Volume2, Loader2 } from 'lucide-react';
import { speak, playSFX } from '../utils/soundUtils';

interface PracticeModeProps {
  onFinish: (score: number, total: number) => void;
  onBack: () => void;
  questions: Question[]; 
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
    if (allQuestions && allQuestions.length > 0) {
        setLoading(true);

        // 1. Shuffle Questions (สุ่มลำดับโจทย์)
        const shuffledQuestions = [...allQuestions].sort(() => 0.5 - Math.random());

        // 2. Limit to 10 (ตัดเหลือ 10 ข้อ สำหรับการฝึกฝนทั่วไป)
        // หมายเหตุ: ถ้าเป็นการบ้าน App.tsx จะตัดมาให้ตามจำนวนที่ครูสั่งแล้ว แต่ถ้าเกิน 10 ข้อในโหมดฝึกเล่นๆ เราจะตัดที่นี้
        const limitedQuestions = shuffledQuestions.slice(0, 10);

        // 3. Sanitize and Shuffle Choices (สุ่มตัวเลือกภายในข้อ)
        const finalQuestions = limitedQuestions.map(q => {
            const safeChoices = q.choices.map((c, idx) => ({
                ...c,
                id: c.id ? normalizeId(c.id) : `gen_choice_${idx}`
            }));

            let correctId = normalizeId(q.correctChoiceId);
            const exists = safeChoices.some(c => c.id === correctId);

            if (!exists) {
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
                        correctId = safeChoices[0].id;
                    }
                }
            }

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
        setQuestions([]);
    }
  }, [allQuestions]);

  const currentQuestion = questions[currentIndex];

  const handleChoiceSelect = (choiceId: string) => {
    if (isSubmitted) return; // Prevent changing answer after submission
    
    setSelectedChoice(choiceId);
    setIsSubmitted(true); // ✅ Instant Submit
    
    const isCorrect = choiceId === currentQuestion.correctChoiceId;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      playSFX('CORRECT');
      speak("ถูกต้องครับ เก่งมาก");
    } else {
      playSFX('WRONG');
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

  // Theme colors for choices
  const choiceColors = [
    { 
      base: 'bg-sky-50 border-sky-200 text-sky-800', 
      hover: 'hover:bg-sky-100 hover:border-sky-300 hover:-translate-y-1', 
    },
    { 
      base: 'bg-emerald-50 border-emerald-200 text-emerald-800', 
      hover: 'hover:bg-emerald-100 hover:border-emerald-300 hover:-translate-y-1', 
    },
    { 
      base: 'bg-amber-50 border-amber-200 text-amber-800', 
      hover: 'hover:bg-amber-100 hover:border-amber-300 hover:-translate-y-1', 
    },
    { 
      base: 'bg-rose-50 border-rose-200 text-rose-800', 
      hover: 'hover:bg-rose-100 hover:border-rose-300 hover:-translate-y-1', 
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
            
            // Default Style
            let buttonStyle = `border-2 shadow-sm transition-all duration-200 relative flex items-center gap-4 ${colorTheme.base}`;
            let badgeStyle = "bg-white border-2 border-white/50 text-gray-500";
            
            // Hover effect only if not submitted
            if (!isSubmitted) {
                buttonStyle += ` ${colorTheme.hover} active:scale-95 cursor-pointer`;
            } else {
                buttonStyle += ` cursor-default`;
            }

            // Submitted State Logic
            if (isSubmitted) {
              if (choice.id === currentQuestion.correctChoiceId) {
                // Correct Answer (Green)
                buttonStyle = "border-2 border-green-500 bg-green-100 text-green-900 shadow-md scale-[1.02] !opacity-100";
                badgeStyle = "bg-green-500 text-white border-transparent";
              } else if (choice.id === selectedChoice) {
                // Selected Wrong Answer (Red)
                buttonStyle = "border-2 border-red-500 bg-red-100 text-red-900 opacity-80";
                badgeStyle = "bg-red-500 text-white border-transparent";
              } else {
                // Other Answers (Grayed out)
                buttonStyle = "border-2 border-gray-100 bg-gray-50 text-gray-400 opacity-40 grayscale";
                badgeStyle = "bg-gray-200 text-gray-400";
              }
            }

            return (
              <button
                key={choice.id}
                onClick={() => handleChoiceSelect(choice.id)}
                disabled={isSubmitted}
                className={`w-full p-3 md:p-4 rounded-3xl text-left text-lg ${buttonStyle}`}
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

                {isSubmitted && choice.id === currentQuestion.correctChoiceId && (
                  <div className="bg-green-500 rounded-full p-1 absolute right-4 shadow-sm animate-bounce">
                     <CheckCircle className="text-white" size={24} />
                  </div>
                )}
                
                {isSubmitted && choice.id === selectedChoice && choice.id !== currentQuestion.correctChoiceId && (
                  <div className="bg-red-500 rounded-full p-1 absolute right-4 shadow-sm">
                     <XCircle className="text-white" size={24} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Actions (Only show when submitted) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-gray-200 md:static md:bg-transparent md:border-0 md:p-0 z-20 min-h-[100px]">
        <div className="max-w-3xl mx-auto">
          {isSubmitted ? (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-5 shadow-sm relative">
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
          ) : (
             <div className="text-center text-gray-400 font-bold animate-pulse py-4">
                 เลือกคำตอบที่ถูกต้องที่สุด
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeMode;
