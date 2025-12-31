
import React, { useMemo } from 'react';
import { Mic, BookText, BarChart3, ArrowLeft, Star } from 'lucide-react';
import { speak } from '../utils/soundUtils';
import { ExamResult, Student } from '../types';

interface RTDashboardProps {
  student: Student;
  examResults: ExamResult[];
  onBack: () => void;
  onNavigate: (subPage: string) => void;
}

const RTDashboard: React.FC<RTDashboardProps> = ({ student, examResults, onBack, onNavigate }) => {
  
  // ฟังก์ชันคำนวณคะแนนเฉลี่ยแบบปลอดภัย (ป้องกัน NaN)
  const calculateAvg = (subjectName: string) => {
    const results = examResults.filter(r => 
        r.studentId === student.id && 
        r.subject === subjectName
    );
    
    if (results.length === 0) return 0;
    
    const totalPercent = results.reduce((sum, r) => {
        const score = Number(r.score) || 0;
        const total = Number(r.totalQuestions) || 1; // กันหารด้วย 0
        return sum + ((score / total) * 100);
    }, 0);
    
    return Math.round(totalPercent / results.length);
  };

  // คำนวณคะแนนเฉลี่ยรายด้าน
  const wordAvg = useMemo(() => calculateAvg('RT-อ่านเป็นคำ'), [examResults, student.id]);
  const sentenceAvg = useMemo(() => calculateAvg('RT-อ่านประโยค'), [examResults, student.id]);
  const passageAvg = useMemo(() => calculateAvg('RT-อ่านข้อความ'), [examResults, student.id]);
  const comprehensionAvg = useMemo(() => calculateAvg('RT-การอ่านรู้เรื่อง'), [examResults, student.id]);

  const handleMenuClick = (title: string, route: string) => {
    speak(`เข้าสู่โหมด ${title} ครับ`);
    onNavigate(route);
  };

  return (
    <div className="min-h-[80vh] pb-10 animate-fade-in px-2 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl text-gray-500 shadow-sm border-2 border-pink-100 hover:text-pink-500 transition-all active:scale-90">
          <ArrowLeft size={28} />
        </button>
        <div className="bg-white px-8 py-2 rounded-full shadow-lg border-b-4 border-pink-400">
            <span className="text-2xl font-black text-pink-500 font-fun tracking-wider">ภารกิจเตรียมสอบ RT</span>
        </div>
        <div className="hidden md:block w-14"></div>
      </div>

      <div className="relative bg-white rounded-[50px] p-8 mb-10 shadow-2xl border-t-8 border-sky-400 overflow-hidden">
         <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
            <div className="text-[10rem] md:text-9xl animate-bounce drop-shadow-2xl select-none">🦉</div>
            <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-black text-sky-600 font-fun mb-3">สวัสดีจ้ะเด็กๆ!</h2>
                <p className="text-gray-500 font-bold text-xl leading-relaxed">พี่นกฮูกจะพาหนูไปพิชิตข้อสอบ RT ให้ได้คะแนนเต็มเลย!</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 1. ฝึกอ่านออกเสียง */}
        <div className="flex flex-col gap-4">
            <button onClick={() => handleMenuClick('ฝึกอ่านออกเสียง', 'rt-reading-aloud')} className="group bg-white rounded-[50px] p-8 shadow-xl border-b-[14px] border-orange-200 hover:border-orange-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-4 transition-all">
                <div className="w-24 h-24 bg-orange-100 rounded-[35px] flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Mic size={48} /></div>
                <h3 className="text-2xl font-black text-gray-800 font-fun text-center">ฝึกอ่านออกเสียง</h3>
                <div className="flex flex-col gap-1 w-full mt-2">
                    <ScoreBadge label="คำ" score={wordAvg} color="text-orange-600" bg="bg-orange-50" />
                    <ScoreBadge label="ประโยค" score={sentenceAvg} color="text-orange-600" bg="bg-orange-50" />
                    <ScoreBadge label="ข้อความ" score={passageAvg} color="text-orange-600" bg="bg-orange-50" />
                </div>
            </button>
        </div>

        {/* 2. ฝึกอ่านรู้เรื่อง */}
        <div className="flex flex-col gap-4">
            <button onClick={() => handleMenuClick('ฝึกอ่านรู้เรื่อง', 'rt-comprehension')} className="group bg-white rounded-[50px] p-8 shadow-xl border-b-[14px] border-sky-200 hover:border-sky-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-4 transition-all">
                <div className="w-24 h-24 bg-sky-100 rounded-[35px] flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors"><BookText size={48} /></div>
                <h3 className="text-2xl font-black text-gray-800 font-fun text-center">ฝึกอ่านรู้เรื่อง</h3>
                <div className="w-full mt-2">
                    <ScoreBadge label="ความเข้าใจ" score={comprehensionAvg} color="text-sky-600" bg="bg-sky-50" />
                </div>
                <p className="text-gray-400 font-bold text-xs mt-2">ตอบคำถามจากภาพและเรื่อง</p>
            </button>
        </div>

        {/* 3. สถิติของฉัน */}
        <button onClick={() => handleMenuClick('สถิติการอ่าน', 'rt-stats')} className="group bg-white rounded-[50px] p-8 shadow-xl border-b-[14px] border-emerald-200 hover:border-emerald-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-6 transition-all h-fit">
          <div className="w-24 h-24 bg-emerald-100 rounded-[35px] flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><BarChart3 size={48} /></div>
          <h3 className="text-3xl font-black text-gray-800 font-fun">สถิติของฉัน</h3>
          <div className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-full font-black flex items-center gap-2 border border-emerald-100 shadow-sm">
             <Star size={20} fill="currentColor" className="text-yellow-400"/> ดูดาวที่หนูได้
          </div>
        </button>
      </div>
    </div>
  );
};

// คอมโพเนนต์แสดงแถบคะแนนจิ๋ว
const ScoreBadge = ({ label, score, color, bg }: { label: string, score: number, color: string, bg: string }) => (
    <div className={`flex items-center justify-between px-3 py-1 ${bg} rounded-full border border-white shadow-inner`}>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{label}</span>
        <span className={`text-sm font-black ${color}`}>{score}%</span>
    </div>
);

export default RTDashboard;
