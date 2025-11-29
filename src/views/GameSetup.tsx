
import React, { useState, useEffect } from 'react';
import { Question, Subject, Teacher } from '../types';
import { ArrowLeft, Play, Layers, Shuffle, GraduationCap } from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { fetchAppData } from '../services/api';

interface GameSetupProps {
  teacher: Teacher; 
  onBack: () => void;
  onGameCreated: (roomCode: string) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ teacher, onBack, onGameCreated }) => {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [selectedSubject, setSelectedSubject] = useState<string>('MIXED'); 
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(20);
  // Default to P2
  const selectedGrade = 'P2';

  useEffect(() => {
    const loadQuestions = async () => {
      const data = await fetchAppData();
      setAllQuestions(data.questions);
      setLoading(false);
    };
    loadQuestions();
  }, []);

  const generateRoomCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCreateGame = async () => {
    setLoading(true);

    // ✅ กรองข้อสอบ: P2 หรือ ALL + โรงเรียนตัวเอง หรือ ส่วนกลาง
    let filtered = allQuestions.filter(q => 
        (q.grade === selectedGrade || q.grade === 'ALL') &&
        (q.school === teacher.school || q.school === 'CENTER' || q.school === 'Admin')
    );

    // 2. กรองวิชา
    if (selectedSubject !== 'MIXED') {
        filtered = filtered.filter(q => q.subject === selectedSubject);
    }

    // 3. สุ่มลำดับ
    filtered.sort(() => 0.5 - Math.random());

    // 4. ตัดจำนวนข้อ
    const finalQuestions = filtered.slice(0, questionCount);

    if (finalQuestions.length === 0) {
        alert(`ไม่พบข้อสอบสำหรับ ป.2 ในหมวดนี้`);
        setLoading(false);
        return;
    }

    // ✅ REPAIR DATA (Same logic as before)
    const sanitizedQuestions = finalQuestions.map((q, idx) => {
        const choices = q.choices.map((c, cIdx) => ({
            id: String(c.id && c.id.length > 0 ? c.id : `choice_${idx}_${cIdx+1}`).trim(),
            text: c.text || '',
            image: c.image || ''
        }));

        let correctId = String(q.correctChoiceId).trim();
        let foundMatch = false;

        if (choices.some(c => c.id === correctId)) {
            foundMatch = true;
        }

        if (!foundMatch) {
            const numericIndex = parseInt(correctId);
            if (!isNaN(numericIndex) && numericIndex >= 1 && numericIndex <= choices.length) {
                correctId = choices[numericIndex - 1].id;
                foundMatch = true;
            }
        }

        if (!foundMatch) {
            const map: Record<string, number> = { 
                'A':0, 'B':1, 'C':2, 'D':3, 
                'a':0, 'b':1, 'c':2, 'd':3,
                'ก':0, 'ข':1, 'ค':2, 'ง':3 
            };
            const cleanKey = correctId.replace('.', ''); 
            if (map[cleanKey] !== undefined && map[cleanKey] < choices.length) {
                correctId = choices[map[cleanKey]].id;
                foundMatch = true;
            }
        }

        if (!foundMatch && choices.length > 0) {
            correctId = choices[0].id; 
        }

        return {
            id: String(q.id || `q${idx}`),
            subject: q.subject || 'GENERAL',
            text: q.text || '',
            image: q.image || '',
            choices: choices,
            correctChoiceId: correctId,
            explanation: q.explanation || '',
            grade: q.grade || 'ALL',
            school: q.school || 'CENTER'
        };
    });

    try {
        const roomCode = generateRoomCode();
        const roomPath = `games/${roomCode}`;
        
        await db.ref(`${roomPath}/scores`).set({});
        await db.ref(`${roomPath}/questions`).set(sanitizedQuestions);
        await db.ref(`${roomPath}/gameState`).set({
            status: 'LOBBY',
            currentQuestionIndex: 0,
            totalQuestions: sanitizedQuestions.length,
            subject: selectedSubject === 'MIXED' ? 'รวมทุกเรื่อง' : selectedSubject,
            grade: 'ป.2',
            timePerQuestion: timePerQuestion,
            timer: timePerQuestion,
            schoolId: teacher.school,
            teacherName: teacher.name
        });
        
        onGameCreated(roomCode);
    } catch (e) {
        alert("Firebase Error: " + e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto min-h-[80vh] flex flex-col pb-10">
       <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4 w-fit">
        <ArrowLeft size={20} /> กลับห้องพักครู
      </button>

      <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 flex-1 border-t-4 border-purple-500">
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                <Layers className="text-purple-600" /> ตั้งค่าเกมการแข่งขัน
            </h2>
            <div className="text-sm text-gray-500 mt-2 bg-purple-50 inline-block px-3 py-1 rounded-full border border-purple-100">
                ภาษาไทย ป.2
            </div>
        </div>

        {/* 1. เลือกเรื่อง */}
        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">1. เลือกเรื่องที่แข่ง</label>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => setSelectedSubject('MIXED')}
                    className={`p-3 rounded-xl border-2 transition flex flex-col items-center ${selectedSubject === 'MIXED' ? 'border-purple-500 bg-purple-100 text-purple-800' : 'border-gray-200'}`}
                >
                    <Shuffle size={20} className="mb-1"/>
                    <span className="font-bold text-sm">คละทุกเรื่อง</span>
                </button>
                {Object.values(Subject).map((sub: any) => (
                     <button 
                        key={sub}
                        onClick={() => setSelectedSubject(sub)}
                        className={`p-3 rounded-xl border-2 transition ${selectedSubject === sub ? 'border-purple-500 bg-purple-100 text-purple-800' : 'border-gray-200'}`}
                    >
                        <span className="font-bold text-sm">{sub}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* 2. จำนวนข้อ & เวลา */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">จำนวนข้อ</label>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border">
                    <input 
                        type="range" min="5" max="50" step="5"
                        value={questionCount} 
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <span className="font-bold text-purple-600 min-w-[30px] text-center">{questionCount}</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">เวลาต่อข้อ (วินาที)</label>
                <select 
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-white font-bold text-gray-700"
                >
                    <option value="10">10 วินาที (เร็ว)</option>
                    <option value="15">15 วินาที</option>
                    <option value="20">20 วินาที (ปกติ)</option>
                    <option value="30">30 วินาที (ช้า)</option>
                </select>
            </div>
        </div>

        <button 
            onClick={handleCreateGame}
            disabled={loading || allQuestions.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-xl shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2"
        >
            {loading ? 'กำลังสร้างห้อง...' : <><Play fill="currentColor" /> เปิดห้องแข่งขัน</>}
        </button>

      </div>
    </div>
  );
};

export default GameSetup;
