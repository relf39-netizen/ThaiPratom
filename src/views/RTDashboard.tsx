
import React, { useMemo } from 'react';
import { Mic, BookText, BarChart3, ArrowLeft, Sparkles, Trophy, Target, Heart, Star } from 'lucide-react';
import { speak } from '../utils/soundUtils';
import { ExamResult, Student } from '../types';

interface RTDashboardProps {
  student: Student;
  examResults: ExamResult[];
  onBack: () => void;
  onNavigate: (subPage: string) => void;
}

const RTDashboard: React.FC<RTDashboardProps> = ({ student, examResults, onBack, onNavigate }) => {
  const handleMenuClick = (title: string, route: string) => {
    speak(`เข้าสู่โหมด ${title} ครับ`);
    onNavigate(route);
  };

  // คำนวณคะแนนเฉลี่ยอ่านรู้เรื่อง
  const comprehensionAvg = useMemo(() => {
    const compResults = examResults.filter(r => r.studentId === student.id && r.subject === 'RT-การอ่านรู้เรื่อง');
    if (compResults.length === 0) return 0;
    const totalPercent = compResults.reduce((sum, r) => sum + ((r.score / r.totalQuestions) * 100), 0);
    return Math.round(totalPercent / compResults.length);
  }, [examResults, student.id]);

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
        {/* ฝึกอ่านออกเสียง */}
        <button onClick={() => handleMenuClick('ฝึกอ่านออกเสียง', 'rt-reading-aloud')} className="group bg-white rounded-[50px] p-10 shadow-xl border-b-[14px] border-orange-200 hover:border-orange-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-6 relative">
          <div className="w-28 h-28 bg-orange-100 rounded-[35px] flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Mic size={56} /></div>
          <h3 className="text-3xl font-black text-gray-800 font-fun">ฝึกอ่านออกเสียง</h3>
          <p className="text-gray-400 font-bold text-sm">อ่านตามพี่นกฮูกนะจ๊ะ</p>
        </button>

        {/* ฝึกอ่านรู้เรื่อง */}
        <button onClick={() => handleMenuClick('ฝึกอ่านรู้เรื่อง', 'rt-comprehension')} className="group bg-white rounded-[50px] p-10 shadow-xl border-b-[14px] border-sky-200 hover:border-sky-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-6 relative">
          <div className="w-28 h-28 bg-sky-100 rounded-[35px] flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors"><BookText size={56} /></div>
          <h3 className="text-3xl font-black text-gray-800 font-fun">ฝึกอ่านรู้เรื่อง</h3>
          
          {/* แสดงคะแนนเฉลี่ยหน้าการ์ด */}
          <div className="bg-sky-50 text-sky-600 px-4 py-1.5 rounded-full font-black flex items-center gap-2 border border-sky-100">
             <Star size={16} fill="currentColor"/> คะแนนเฉลี่ย: {comprehensionAvg}%
          </div>
        </button>

        {/* สถิติของฉัน */}
        <button onClick={() => handleMenuClick('สถิติการอ่าน', 'rt-stats')} className="group bg-white rounded-[50px] p-10 shadow-xl border-b-[14px] border-emerald-200 hover:border-emerald-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-6 relative">
          <div className="w-28 h-28 bg-emerald-100 rounded-[35px] flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><BarChart3 size={56} /></div>
          <h3 className="text-3xl font-black text-gray-800 font-fun">สถิติของฉัน</h3>
          <p className="text-gray-400 font-bold text-sm">ดูดาวที่สะสมได้</p>
        </button>
      </div>
    </div>
  );
};

export default RTDashboard;
