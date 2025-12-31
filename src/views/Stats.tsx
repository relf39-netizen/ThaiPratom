
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Trophy, AlertCircle, Activity, Star, Target } from 'lucide-react';
import { ExamResult, Student, SubjectDef } from '../types';
import { getSchoolSubjects } from '../services/subjectService';

interface StatsProps {
  examResults: ExamResult[];
  student: Student;
  onBack: () => void;
}

const Stats: React.FC<StatsProps> = ({ examResults, student, onBack }) => {
  const [subjectDefs, setSubjectDefs] = useState<SubjectDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const load = async () => {
          if (student.school) {
              const allSubjects = await getSchoolSubjects(student.school);
              const studentGrade = student.grade || 'P2';
              setSubjectDefs(allSubjects.filter(s => s.grade === studentGrade));
          }
          setLoading(false);
      };
      load();
  }, [student]);

  const statsData = useMemo(() => {
    const myResults = examResults.filter(r => r.studentId === student.id);

    // คำนวณรายวิชาปกติ
    const data = subjectDefs.map(subject => {
        const subjectResults = myResults.filter(r => r.subject === subject.name);
        const totalAttempts = subjectResults.length;
        let avgScore = 0;
        if (totalAttempts > 0) {
            const totalPercent = subjectResults.reduce((sum, r) => sum + ((r.score / r.totalQuestions) * 100), 0);
            avgScore = Math.round(totalPercent / totalAttempts);
        }
        return {
            name: subject.name,
            attempts: totalAttempts,
            score: avgScore,
            color: getHexColor(subject.color),
            icon: subject.icon
        };
    });

    const playedSubjects = data.filter(d => d.attempts > 0);
    const bestSubject = playedSubjects.length > 0 ? playedSubjects.reduce((prev, current) => (prev.score > current.score) ? prev : current) : null;
    const weakSubject = playedSubjects.length > 0 ? playedSubjects.reduce((prev, current) => (prev.score < current.score) ? prev : current) : null;

    return { chartData: data, totalExams: myResults.length, bestSubject, weakSubject };
  }, [examResults, student.id, subjectDefs]);

  function getHexColor(colorName: string) {
      const map: Record<string, string> = {
          'red': '#ef4444', 'yellow': '#eab308', 'green': '#22c55e',
          'blue': '#3b82f6', 'purple': '#a855f7', 'pink': '#ec4899', 'orange': '#f97316'
      };
      return map[colorName] || '#6b7280';
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2 font-black">
        <ArrowLeft size={20} /> กลับหน้าหลัก
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 font-fun">สมุดพกความสำเร็จของ {student.name.split(' ')[0]}</h2>
        <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black">
            ฝึกฝนไปแล้ว {statsData.totalExams} ครั้ง
        </div>
      </div>
      
      {/* Chart */}
      <div className="bg-white p-6 rounded-[32px] shadow-lg border border-gray-100 h-80 relative overflow-hidden">
        <h3 className="font-black text-gray-500 mb-4 flex items-center gap-2 relative z-10">
            <Activity size={18} /> คะแนนเฉลี่ยรายวิชา (%)
        </h3>
        {loading ? (
             <div className="h-full flex items-center justify-center text-gray-400">กำลังโหลด...</div>
        ) : statsData.totalExams > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
            <BarChart data={statsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 10}} axisLine={false} tickLine={false} dy={10} interval={0} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => [`${value}%`, 'คะแนนเฉลี่ย']}
                />
                <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={40}>
                {statsData.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <p className="font-black">ยังไม่มีข้อมูลการสอบจ้ะ</p>
                <p className="text-sm">ลองไปฝึกทำข้อสอบกับพี่นกฮูกก่อนนะ!</p>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statsData.bestSubject && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border-2 border-green-100 flex items-center gap-4 relative overflow-hidden">
                <div className="bg-green-100 p-4 rounded-full text-green-600">
                    <Trophy size={28} />
                </div>
                <div>
                    <span className="text-green-600 text-xs font-black uppercase tracking-wider">วิชาที่หนูเก่งที่สุด</span>
                    <p className="text-xl font-black text-gray-800">{statsData.bestSubject.name}</p>
                    <p className="text-sm text-gray-500 font-bold">คะแนนเฉลี่ย {statsData.bestSubject.score}%</p>
                </div>
                <Star className="absolute top-2 right-2 text-yellow-400 fill-yellow-400 animate-pulse" size={32} />
            </div>
        )}
        
        {statsData.weakSubject && statsData.weakSubject.score < 50 && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border-2 border-red-100 flex items-center gap-4">
                <div className="bg-red-100 p-4 rounded-full text-red-500">
                    <AlertCircle size={28} />
                </div>
                <div>
                    <span className="text-red-500 text-xs font-black uppercase tracking-wider">ควรฝึกฝนเพิ่มจ้ะ</span>
                    <p className="text-xl font-black text-gray-800">{statsData.weakSubject.name}</p>
                    <p className="text-sm text-gray-500 font-bold">คะแนนเฉลี่ย {statsData.weakSubject.score}%</p>
                </div>
            </div>
        )}
      </div>

      <h3 className="text-lg font-black text-gray-700 mt-4 flex items-center gap-2"><Target size={20}/> รายละเอียดรายวิชา</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {statsData.chartData.map((sub) => (
            <div key={sub.name} className="bg-white p-4 rounded-2xl border-2 border-gray-50 shadow-sm flex justify-between items-center transition-all">
                <div className="flex items-center gap-3">
                    <div className="text-2xl">{sub.icon}</div>
                    <div>
                        <div className="font-black text-gray-800 text-base">{sub.name}</div>
                        <div className="text-xs text-gray-400 font-black bg-gray-100 px-2 py-0.5 rounded-md">
                            เฉลี่ย {sub.score}%
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-blue-600">{sub.attempts}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">ครั้งที่ฝึก</div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Stats;
