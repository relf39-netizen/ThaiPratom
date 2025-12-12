
import React, { useState, useEffect } from 'react';
import { Question, SubjectDef, Teacher } from '../types';
import { ArrowLeft, Play, Layers, Shuffle, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchAppData } from '../services/api';
import { getSchoolSubjects } from '../services/subjectService';

interface GameSetupProps {
  teacher: Teacher; 
  onBack: () => void;
  onGameCreated: (roomCode: string) => void;
}

const GRADE_OPTIONS = [
    { value: 'P1', label: 'ป.1', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'P2', label: 'ป.2', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'P3', label: 'ป.3', color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'P4', label: 'ป.4', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'P5', label: 'ป.5', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'P6', label: 'ป.6', color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

const GameSetup: React.FC<GameSetupProps> = ({ teacher, onBack, onGameCreated }) => {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<SubjectDef[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [selectedGrade, setSelectedGrade] = useState<string>('P2');
  const [selectedSubject, setSelectedSubject] = useState<string>('MIXED');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(20);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const data = await fetchAppData();
      setAllQuestions(data.questions);
      const subjects = await getSchoolSubjects(teacher.school);
      setSchoolSubjects(subjects);
      setLoading(false);
    };
    init();
  }, [teacher.school]);

  const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleCreateGame = async () => {
    setLoading(true);

    let filtered = allQuestions.filter(q => {
        const qGrade = (q.grade || 'ALL').toUpperCase();
        const gradeMatch = qGrade === selectedGrade || qGrade === 'ALL';
        const qSchool = (q.school || 'CENTER');
        const schoolMatch = qSchool === teacher.school || qSchool === 'CENTER' || qSchool === 'Admin';
        return gradeMatch && schoolMatch;
    });

    if (selectedSubject !== 'MIXED') {
        filtered = filtered.filter(q => q.subject === selectedSubject);
    }

    filtered.sort(() => 0.5 - Math.random());
    const finalQuestions = filtered.slice(0, questionCount);

    if (finalQuestions.length === 0) {
        alert(`ไม่พบข้อสอบสำหรับชั้น ${selectedGrade} ในหมวดนี้`);
        setLoading(false);
        return;
    }

    const sanitizedQuestions = finalQuestions.map((q, idx) => ({
        id: String(q.id || `q${idx}`),
        subject: q.subject || 'GENERAL',
        text: q.text || '',
        image: q.image || '',
        choices: q.choices,
        correctChoiceId: String(q.correctChoiceId).trim(),
        explanation: q.explanation || '',
        grade: q.grade || 'ALL',
        school: q.school || 'CENTER'
    }));

    try {
        const roomCode = generateRoomCode();
        let displaySubjectName = selectedSubject === 'MIXED' ? "รวมทุกวิชา" : selectedSubject;

        // Upsert to Supabase 'game_rooms'
        const { error } = await supabase.from('game_rooms').upsert([{
            room_code: roomCode,
            status: 'LOBBY',
            current_question_index: 0,
            grade: selectedGrade,
            subject: displaySubjectName,
            time_per_question: timePerQuestion,
            timer: timePerQuestion,
            questions: sanitizedQuestions,
            players: [],
            scores: {}
        }]);

        if (error) throw error;
        onGameCreated(roomCode);
    } catch (e: any) {
        alert("Supabase Error: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const availableSubjects = schoolSubjects.filter(s => s.grade === selectedGrade);

  return (
    <div className="max-w-3xl mx-auto min-h-[80vh] flex flex-col pb-10">
       <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4 w-fit">
        <ArrowLeft size={20} /> กลับห้องพักครู
      </button>

      <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 flex-1 border-t-4 border-purple-500">
        <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                <Layers className="text-purple-600" /> ตั้งค่าเกมการแข่งขัน
            </h2>
        </div>

        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">1. เลือกระดับชั้น</label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {GRADE_OPTIONS.map(g => (
                    <button 
                        key={g.value}
                        onClick={() => { setSelectedGrade(g.value); setSelectedSubject('MIXED'); }}
                        className={`py-3 px-2 rounded-xl border-2 font-bold transition-all ${
                            selectedGrade === g.value 
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105' 
                            : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'
                        }`}
                    >
                        {g.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">2. เลือกวิชา ({availableSubjects.length} วิชา)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                <button 
                    onClick={() => setSelectedSubject('MIXED')}
                    className={`p-4 rounded-xl border-2 transition flex flex-col items-center justify-center gap-2 relative overflow-hidden ${
                        selectedSubject === 'MIXED' 
                        ? 'border-purple-500 bg-purple-50 text-purple-800 shadow-inner' 
                        : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                    }`}
                >
                    <Shuffle size={24} className={selectedSubject === 'MIXED' ? 'text-purple-600' : 'text-gray-400'}/>
                    <span className="font-bold text-sm">คละทุกวิชา</span>
                    {selectedSubject === 'MIXED' && <div className="absolute top-2 right-2 text-purple-600"><Check size={16} /></div>}
                </button>

                {availableSubjects.map((sub) => (
                     <button 
                        key={sub.id}
                        onClick={() => setSelectedSubject(sub.name)}
                        className={`p-4 rounded-xl border-2 transition flex flex-col items-center justify-center gap-2 relative overflow-hidden ${
                            selectedSubject === sub.name 
                            ? `border-${sub.color}-500 bg-${sub.color}-50 text-${sub.color}-800 shadow-inner` 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <span className="text-2xl">{sub.icon}</span>
                        <span className="font-bold text-sm truncate w-full text-center">{sub.name}</span>
                        {selectedSubject === sub.name && <div className={`absolute top-2 right-2 text-${sub.color}-600`}><Check size={16} /></div>}
                    </button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">จำนวนข้อ</label>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border">
                    <input 
                        type="range" min="5" max="30" step="5"
                        value={questionCount} 
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <span className="font-bold text-purple-600 min-w-[30px] text-center">{questionCount}</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">เวลาต่อข้อ</label>
                <select 
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-200"
                >
                    <option value="10">10 วินาที ⚡</option>
                    <option value="20">20 วินาที (ปกติ)</option>
                    <option value="30">30 วินาที (ช้า)</option>
                    <option value="60">60 วินาที 🐢</option>
                </select>
            </div>
        </div>

        <button 
            onClick={handleCreateGame}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-xl shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
        >
            {loading ? 'กำลังสร้างห้อง...' : <><Play fill="currentColor" /> เปิดห้องแข่งขัน</>}
        </button>

      </div>
    </div>
  );
};

export default GameSetup;
