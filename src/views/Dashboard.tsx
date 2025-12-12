
import React, { useState, useEffect } from 'react';
import { BookOpen, Gamepad2, BarChart3, Star, Calendar, CheckCircle, AlertCircle, History, ArrowLeft, Clock, Puzzle, Music, Users, Trees, Link as LinkIcon, Loader2, ShoppingBag } from 'lucide-react';
import { Student, Assignment, ExamResult, Subject, SubjectDef } from '../types';
import { getSchoolSubjects } from '../services/subjectService';

interface DashboardProps {
  student: Student;
  assignments?: Assignment[]; 
  examResults?: ExamResult[]; 
  onNavigate: (page: string) => void;
  onStartAssignment?: (assignment: Assignment) => void;
  onSelectSubject: (subject: Subject) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ student, assignments = [], examResults = [], onNavigate, onStartAssignment, onSelectSubject }) => {
  const [view, setView] = useState<'main' | 'history'>('main');
  const [notification, setNotification] = useState<string | null>(null);
  const [displaySubjects, setDisplaySubjects] = useState<SubjectDef[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  if (!student) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></div>;

  useEffect(() => {
      const load = async () => {
          // 1. Determine School (Fallback to 'Admin School' if missing to ensure data shows up)
          const targetSchool = student.school || 'Admin School';
          
          // 2. Fetch subjects for that school
          const custom = await getSchoolSubjects(targetSchool);
          
          // 3. Identify Student Grade (Default to P2 if missing)
          const studentGrade = student.grade || 'P2';
          
          // 4. FILTER: Show subjects that match Grade OR are for ALL grades
          const filtered = custom.filter(s => s.grade === studentGrade || s.grade === 'ALL');
          
          setDisplaySubjects(filtered);
          setLoadingSubjects(false);
      };
      load();
  }, [student]);

  // Filter assignments by School AND Grade
  const myAssignments = assignments.filter(a => {
      if (a.school !== student.school) return false;
      // If assignment has a specific grade (not ALL), and student has a grade, they must match
      if (a.grade && a.grade !== 'ALL' && student.grade) {
          if (a.grade !== student.grade) return false;
      }
      return true;
  });
  
  const finishedAssignments = myAssignments.filter(a => examResults.some(r => r.assignmentId === a.id));
  const pendingAssignments = myAssignments.filter(a => !examResults.some(r => r.assignmentId === a.id));

  // Sort
  pendingAssignments.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  finishedAssignments.sort((a, b) => {
      const resultA = examResults.find(r => r.assignmentId === a.id);
      const resultB = examResults.find(r => r.assignmentId === b.id);
      return (resultB?.timestamp || 0) - (resultA?.timestamp || 0);
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  const handleStartWithNotification = (assignment: Assignment) => {
      setNotification(`กำลังเริ่มทำการบ้าน: ${assignment.subject}...`);
      setTimeout(() => {
          if(onStartAssignment) onStartAssignment(assignment);
          setNotification(null);
      }, 1000);
  };

  const GRADE_LABELS: Record<string, string> = { 'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6' };
  const safeName = student.name ? String(student.name) : 'นักเรียน';
  const studentFirstName = safeName.split(' ')[0] || safeName;

  if (view === 'history') {
    return (
      <div className="space-y-6 pb-20 animate-fade-in">
        <button onClick={() => setView('main')} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          <ArrowLeft size={20} /> กลับหน้าแดชบอร์ด
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><History size={32} /></div>
          <div><h2 className="text-2xl font-bold text-gray-800">ประวัติการส่งงาน</h2><p className="text-gray-500">รายการที่ทำเสร็จแล้ว ({finishedAssignments.length})</p></div>
        </div>
        <div className="space-y-4">
          {finishedAssignments.length > 0 ? (
            finishedAssignments.map(hw => {
              const result = examResults.find(r => r.assignmentId === hw.id);
              return (
                <div key={hw.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-lg">{hw.subject}</span>
                        <span className="text-xs text-gray-400">{new Date(result?.timestamp || 0).toLocaleString('th-TH')}</span>
                     </div>
                     <div className="font-bold text-gray-800 text-lg">การบ้าน {hw.questionCount} ข้อ</div>
                   </div>
                   <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end bg-gray-50 p-3 rounded-xl sm:bg-transparent sm:p-0">
                     <div className="text-right">
                        <div className="text-xs text-gray-400 font-medium uppercase">คะแนนที่ได้</div>
                        <div className="text-2xl font-black text-blue-600 leading-none">{result ? result.score : 0}<span className="text-sm text-gray-400 font-medium">/{result ? result.totalQuestions : 0}</span></div>
                     </div>
                     <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle size={24} /></div>
                   </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border-2 border-dashed">ยังไม่มีประวัติการส่งงาน</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 relative">
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-fade-in flex items-center gap-3">
             <Loader2 size={20} className="animate-spin text-yellow-400" />
             <span className="font-bold text-sm">{notification}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden border-b-8 border-orange-600/20">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10 animate-pulse"><Star size={150} /></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="text-6xl bg-white p-3 rounded-full shadow-lg border-4 border-yellow-300 transform hover:scale-110 transition duration-300 cursor-pointer">{student.avatar}</div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black mb-1 font-fun drop-shadow-md">สวัสดีจ้ะ, {studentFirstName}!</h2>
            <div className="flex justify-center md:justify-start gap-2 text-white/90 items-center font-bold text-sm mb-3">
                <span className="bg-black/10 px-2 py-0.5 rounded-lg">ชั้น {GRADE_LABELS[student.grade || 'P2'] || student.grade}</span>
                <span>•</span>
                <span>{student.school || 'โรงเรียนคุณภาพ'}</span>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-white/20 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/30 hover:bg-white/30 transition">
                    <Star className="text-yellow-300 fill-yellow-300 drop-shadow" size={20} />
                    <span className="font-bold text-lg">{student.stars}</span>
                    <span className="text-sm opacity-90">คะแนน</span>
                </div>
                {/* ปุ่มไปร้านค้า (เฉพาะหน้าจอเล็ก หรือแปะไว้ตรงนี้ให้เด่น) */}
                <button 
                    onClick={() => onNavigate('shop')}
                    className="flex items-center gap-2 bg-white text-pink-600 w-fit px-4 py-1.5 rounded-full font-bold shadow-sm hover:scale-105 transition"
                >
                    <ShoppingBag size={18} /> ร้านค้า
                </button>
            </div>

          </div>
        </div>
      </div>

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 ? (
        <div className="bg-white border-4 border-orange-100 rounded-3xl p-6 shadow-sm animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-orange-100 px-4 py-1 rounded-bl-2xl text-orange-600 font-bold text-xs">งานด่วน!</div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-xl text-orange-600"><Calendar size={24} /></div>
                การบ้านของหนู ({pendingAssignments.length})
            </h3>
            <div className="space-y-3">
                {pendingAssignments.map(hw => {
                    const isExpired = new Date(hw.deadline) < new Date();
                    return (
                        <div key={hw.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center border-2 gap-3 transition hover:shadow-md ${isExpired ? 'bg-red-50 border-red-100' : 'bg-orange-50/50 border-orange-100 hover:bg-orange-50'}`}>
                            <div>
                                <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                  {hw.subject} 
                                  {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-bold">เลยกำหนด</span>}
                                </div>
                                <div className={`text-sm ${isExpired ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                                  มี {hw.questionCount} ข้อ • ส่งภายใน {formatDate(hw.deadline)}
                                </div>
                            </div>
                            <button 
                                onClick={() => handleStartWithNotification(hw)}
                                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all border-b-4 ${isExpired ? 'bg-red-500 text-white hover:bg-red-600 border-red-700' : 'bg-orange-400 text-white hover:bg-orange-500 border-orange-600'}`}
                            >
                                {isExpired ? 'ส่งงานล่าช้า' : 'เริ่มทำเลย'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      ) : (
        <div className="bg-green-100 border-2 border-green-200 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 text-green-700 text-center shadow-sm">
           <div className="bg-white p-2 rounded-full"><CheckCircle size={32} className="text-green-500"/></div>
           <span className="font-bold text-lg">เยี่ยมมาก! หนูทำการบ้านครบแล้ว</span>
        </div>
      )}

      {/* Dynamic Subject Cards */}
      <div>
        <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2 font-fun ml-2">
           <BookOpen className="text-blue-500 fill-blue-500" /> บทเรียนน่ารู้ (ฝึกฝน)
        </h3>
        {loadingSubjects ? <div className="text-center py-10">กำลังโหลดวิชาเรียน...</div> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {displaySubjects.length > 0 ? displaySubjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onSelectSubject(sub.name)}
                    className={`group relative p-4 md:p-6 rounded-[24px] border-b-8 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-1 active:border-b-0 flex flex-col items-center gap-3 text-center bg-${sub.color || 'blue'}-50 hover:bg-${sub.color || 'blue'}-100 border-${sub.color || 'blue'}-200 text-${sub.color || 'blue'}-600 bg-white`}
                  >
                    <div className="bg-white/80 p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform group-hover:rotate-6 text-3xl">
                      {sub.icon || '📖'}
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-bold leading-tight">{sub.name}</h3>
                    </div>
                  </button>
                )) : (
                    <div className="col-span-full text-center text-gray-400 py-10 bg-white rounded-3xl border-2 border-dashed">
                        <p className="text-lg font-bold">ไม่พบวิชาเรียนสำหรับชั้น {GRADE_LABELS[student.grade || 'P2']}</p>
                        <p className="text-sm">คุณครูยังไม่ได้เพิ่มวิชาเข้าระบบครับ</p>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Activities */}
      <div>
        <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2 font-fun ml-2">
            <Gamepad2 className="text-purple-500 fill-purple-500"/> สนุกกับกิจกรรม
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => onNavigate('shop')} className="col-span-2 md:col-span-1 group relative bg-white rounded-[24px] p-5 shadow-sm hover:shadow-lg transition-all border-b-8 border-pink-200 hover:border-pink-400 active:border-b-0 active:translate-y-2 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="bg-pink-100 w-14 h-14 rounded-2xl flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors"><ShoppingBag size={32} /></div>
              <div><h3 className="text-lg font-bold text-gray-800 group-hover:text-pink-600">ร้านค้า</h3><p className="text-gray-400 text-xs group-hover:text-pink-500">แลกของรางวัล</p></div>
            </button>

            <button onClick={() => onNavigate('game')} className="col-span-2 md:col-span-1 group relative bg-white rounded-[24px] p-5 shadow-sm hover:shadow-lg transition-all border-b-8 border-purple-200 hover:border-purple-400 active:border-b-0 active:translate-y-2 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="bg-purple-100 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors"><Gamepad2 size={32} /></div>
              <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-600">เกมแข่งขัน</h3>
                  <p className="text-gray-400 text-xs group-hover:text-purple-400">แข่งตอบคำถาม</p>
              </div>
              <div className="absolute top-4 right-4 flex gap-1"><span className="flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span></div>
            </button>
            <button onClick={() => setView('history')} className="group bg-white rounded-[24px] p-5 shadow-sm hover:shadow-lg transition-all border-b-8 border-yellow-200 hover:border-yellow-400 active:border-b-0 active:translate-y-2 flex flex-col items-center gap-2">
              <div className="bg-yellow-100 w-10 h-10 rounded-2xl flex items-center justify-center text-yellow-600"><History size={20} /></div>
              <h3 className="text-sm font-bold text-gray-800">ประวัติส่งงาน</h3>
            </button>
            <button onClick={() => onNavigate('stats')} className="group bg-white rounded-[24px] p-5 shadow-sm hover:shadow-lg transition-all border-b-8 border-green-200 hover:border-green-400 active:border-b-0 active:translate-y-2 flex flex-col items-center gap-2">
              <div className="bg-green-100 w-10 h-10 rounded-2xl flex items-center justify-center text-green-600"><BarChart3 size={20} /></div>
              <h3 className="text-sm font-bold text-gray-800">ผลการเรียน</h3>
            </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
