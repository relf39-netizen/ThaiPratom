
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Gamepad2, Star, Calendar, CheckCircle, 
  History, ArrowLeft, Loader2, Mic2, BookText, Trophy, Sparkles,
  Calculator, BrainCircuit
} from 'lucide-react';
import { Student, Assignment, ExamResult, Subject, SubjectDef } from '../types';
import { getSchoolSubjects } from '../services/subjectService';
import { speak } from '../utils/soundUtils';

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
  const [displaySubjects, setDisplaySubjects] = useState<SubjectDef[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
      const load = async () => {
          const targetSchool = student.school || 'Admin School';
          const custom = await getSchoolSubjects(targetSchool);
          const studentGrade = student.grade || 'P2';
          const filtered = custom.filter(s => s.grade === studentGrade || s.grade === 'ALL');
          setDisplaySubjects(filtered);
          setLoadingSubjects(false);
      };
      load();
  }, [student]);

  const myAssignments = assignments.filter(a => a.school === student.school);
  const pendingAssignments = myAssignments.filter(a => !examResults.some(r => r.assignmentId === a.id));
  const finishedAssignments = myAssignments.filter(a => examResults.some(r => r.assignmentId === a.id));

  const handleMissionAction = (title: string, route: string) => {
      speak(`เข้าสู่ ${title} จ้ะ`);
      onNavigate(route);
  };

  const GRADE_LABELS: Record<string, string> = { 'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6' };

  if (view === 'history') {
    return (
      <div className="space-y-6 pb-20 animate-fade-in">
        <button onClick={() => setView('main')} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4 font-bold">
          <ArrowLeft size={20} /> กลับหน้าหลัก
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><History size={32} /></div>
          <h2 className="text-2xl font-bold text-gray-800 font-fun">ประวัติการส่งงาน</h2>
        </div>
        <div className="space-y-4">
          {finishedAssignments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">ยังไม่มีประวัติการส่งงานจ้ะ</div>
          ) : (
            finishedAssignments.map(hw => {
                const result = examResults.find(r => r.assignmentId === hw.id);
                return (
                  <div key={hw.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-100 flex justify-between items-center">
                     <div>
                       <div className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-lg inline-block mb-1">{hw.subject}</div>
                       <div className="font-bold text-gray-800 text-lg">ได้คะแนน {result?.score}/{result?.totalQuestions}</div>
                     </div>
                     <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle size={24} /></div>
                  </div>
                );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-pink-400 to-orange-400 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="text-7xl bg-white p-3 rounded-full shadow-lg border-4 border-yellow-300">{student.avatar}</div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-4xl font-black mb-1 font-fun">สวัสดีจ้ะ, {student.name.split(' ')[0]}!</h2>
            <p className="font-bold opacity-90 mb-4">ชั้น {GRADE_LABELS[student.grade || 'P2']} • {student.school}</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-white/20 px-5 py-2 rounded-full backdrop-blur-sm border border-white/30">
                    <Star className="text-yellow-300 fill-yellow-300" size={24} />
                    <span className="font-black text-2xl">{student.stars} ดาว</span>
                </div>
                <button onClick={() => onNavigate('shop')} className="bg-white text-pink-600 px-6 py-2 rounded-full font-black shadow-lg hover:scale-105 transition">
                    ไปร้านค้าของเล่น
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🦉 RT Special Mission - ONLY FOR GRADE P1 */}
      {(student.grade === 'P1' || student.grade === 'p1') && (
        <div className="space-y-4">
            <div className="flex items-center gap-2 ml-4">
                <Sparkles className="text-orange-500 fill-orange-500 animate-pulse" size={28} />
                <h3 className="text-2xl font-black text-gray-800 font-fun">ภารกิจลับเตรียมสอบ RT</h3>
            </div>
            
            <div className="bg-white rounded-[50px] p-8 shadow-2xl border-4 border-sky-100 flex flex-col lg:flex-row items-center gap-8 relative overflow-hidden group">
                <div className="absolute -top-6 -right-6 text-sky-50 opacity-10 group-hover:scale-110 transition-transform"><Mic2 size={200} /></div>
                <div className="flex flex-col items-center">
                    <div className="text-[100px] animate-bounce cursor-pointer" onClick={() => speak("พี่นกฮูกพร้อมแล้วจ้ะ")}>🦉</div>
                    <div className="bg-sky-50 px-4 py-1 rounded-full text-sky-700 font-black text-sm">พี่นกฮูกพร้อมแล้ว!</div>
                </div>

                <div className="flex-1 space-y-6 relative z-10">
                    <div className="text-center lg:text-left">
                        <h4 className="text-3xl font-black text-sky-600 font-fun mb-2">หนูพร้อมพิชิตการอ่านหรือยังจ๊ะ?</h4>
                        <p className="text-gray-500 font-bold">สะสมคะแนนจากการอ่านให้ครบ เพื่อแลกของรางวัลสุดพิเศษ!</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => handleMissionAction('ฝึกอ่านออกเสียง', 'rt-reading-aloud')} className="flex flex-col items-center p-6 bg-orange-50 hover:bg-orange-100 border-b-8 border-orange-200 rounded-[35px] transition-all transform hover:-translate-y-1 active:translate-y-1 active:border-b-0 group">
                            <div className="bg-white p-4 rounded-3xl shadow-sm text-orange-500 mb-3 group-hover:scale-110 transition-transform"><Mic2 size={36} /></div>
                            <span className="font-black text-orange-700 text-lg font-fun">ฝึกอ่านออกเสียง</span>
                        </button>

                        <button onClick={() => handleMissionAction('ฝึกอ่านรู้เรื่อง', 'rt-comprehension')} className="flex flex-col items-center p-6 bg-sky-50 hover:bg-sky-100 border-b-8 border-sky-200 rounded-[35px] transition-all transform hover:-translate-y-1 active:translate-y-1 active:border-b-0 group">
                            <div className="bg-white p-4 rounded-3xl shadow-sm text-sky-500 mb-3 group-hover:scale-110 transition-transform"><BookText size={36} /></div>
                            <span className="font-black text-sky-700 text-lg font-fun">ฝึกอ่านรู้เรื่อง</span>
                        </button>

                        <button onClick={() => handleMissionAction('สถิติของฉัน', 'rt-stats')} className="flex flex-col items-center p-6 bg-emerald-50 hover:bg-emerald-100 border-b-8 border-emerald-200 rounded-[35px] transition-all transform hover:-translate-y-1 active:translate-y-1 active:border-b-0 group">
                            <div className="bg-white p-4 rounded-3xl shadow-sm text-emerald-500 mb-3 group-hover:scale-110 transition-transform"><Trophy size={36} /></div>
                            <span className="font-black text-emerald-700 text-lg font-fun">สถิติของฉัน</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 🐘 NT Special Mission - ONLY FOR GRADE P3 */}
      {(student.grade === 'P3' || student.grade === 'p3') && (
        <div className="space-y-4">
            <div className="flex items-center gap-2 ml-4">
                <Sparkles className="text-purple-500 fill-purple-500 animate-pulse" size={28} />
                <h3 className="text-2xl font-black text-gray-800 font-fun">ภารกิจเตรียมสอบ NT ป.3</h3>
            </div>
            
            <div className="bg-white rounded-[50px] p-8 shadow-2xl border-4 border-purple-100 flex flex-col lg:flex-row items-center gap-8 relative overflow-hidden group">
                <div className="absolute -top-6 -right-6 text-purple-50 opacity-10 group-hover:scale-110 transition-transform"><BrainCircuit size={200} /></div>
                <div className="flex flex-col items-center">
                    <div className="text-[100px] animate-bounce cursor-pointer" onClick={() => speak("พี่ช้างพร้อมติว NT ให้แล้วจ้ะ")}>🐘</div>
                    <div className="bg-purple-50 px-4 py-1 rounded-full text-purple-700 font-black text-sm">พี่ช้างพร้อมติว!</div>
                </div>

                <div className="flex-1 space-y-6 relative z-10">
                    <div className="text-center lg:text-left">
                        <h4 className="text-3xl font-black text-purple-600 font-fun mb-2">ตะลุยโจทย์ NT พิชิตคะแนนเต็ม</h4>
                        <p className="text-gray-500 font-bold">ฝึกฝนทักษะการคำนวณและภาษาไทยเพื่อเตรียมสอบระดับชาติจ้ะ</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => handleMissionAction('ติว NT คณิตศาสตร์', 'nt-math')} className="flex flex-col items-center p-6 bg-blue-50 hover:bg-blue-100 border-b-8 border-blue-200 rounded-[35px] transition-all transform hover:-translate-y-1 active:translate-y-1 active:border-b-0 group">
                            <div className="bg-white p-4 rounded-3xl shadow-sm text-blue-500 mb-3 group-hover:scale-110 transition-transform"><Calculator size={36} /></div>
                            <span className="font-black text-blue-700 text-lg font-fun">ด้านคำนวณ</span>
                        </button>

                        <button onClick={() => handleMissionAction('ติว NT ภาษาไทย', 'nt-thai')} className="flex flex-col items-center p-6 bg-pink-50 hover:bg-pink-100 border-b-8 border-pink-200 rounded-[35px] transition-all transform hover:-translate-y-1 active:translate-y-1 active:border-b-0 group">
                            <div className="bg-white p-4 rounded-3xl shadow-sm text-pink-500 mb-3 group-hover:scale-110 transition-transform"><BookText size={36} /></div>
                            <span className="font-black text-pink-700 text-lg font-fun">ด้านภาษาไทย</span>
                        </button>

                        <button onClick={() => handleMissionAction('สถิติ NT ของฉัน', 'nt-stats')} className="flex flex-col items-center p-6 bg-indigo-50 hover:bg-indigo-100 border-b-8 border-indigo-200 rounded-[35px] transition-all transform hover:-translate-y-1 active:translate-y-1 active:border-b-0 group">
                            <div className="bg-white p-4 rounded-3xl shadow-sm text-indigo-500 mb-3 group-hover:scale-110 transition-transform"><Trophy size={36} /></div>
                            <span className="font-black text-indigo-700 text-lg font-fun">สถิติของฉัน</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Homework Section */}
          <div className="space-y-4">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-2xl font-black text-gray-800 font-fun flex items-center gap-2"><Calendar className="text-pink-500" /> การบ้านของหนู</h3>
                <button onClick={() => setView('history')} className="text-sm font-bold text-blue-600 hover:underline">ดูประวัติ</button>
              </div>

              {pendingAssignments.length === 0 ? (
                  <div className="bg-white rounded-[40px] p-10 text-center border-4 border-dashed border-gray-100 text-gray-400 font-bold">ไม่มีการบ้านค้างจ้ะ 🌈</div>
              ) : (
                  <div className="space-y-4">
                      {pendingAssignments.map(hw => (
                          <div key={hw.id} className="bg-white p-6 rounded-[35px] shadow-lg border-b-8 border-orange-100 hover:shadow-xl transition-all">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><BookOpen size={24}/></div>
                                      <div>
                                          <h4 className="font-black text-gray-800 text-xl font-fun">{hw.subject}</h4>
                                          <div className="text-gray-400 text-xs font-bold">ส่งภายใน {new Date(hw.deadline).toLocaleDateString('th-TH')}</div>
                                      </div>
                                  </div>
                              </div>
                              <button onClick={() => onStartAssignment && onStartAssignment(hw)} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-orange-600 active:scale-95 transition">เริ่มทำเลยจ๊ะ</button>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* Quick Practice & Games */}
          <div className="space-y-4">
              <h3 className="text-2xl font-black text-gray-800 font-fun px-4 flex items-center gap-2"><Gamepad2 className="text-purple-500" /> ห้องเรียนแสนสนุก</h3>
              <div className="space-y-4">
                  <button onClick={() => onNavigate('game')} className="w-full bg-white p-6 rounded-[35px] shadow-lg border-b-8 border-purple-100 hover:-translate-y-1 transition-all text-left flex items-center gap-6 group">
                      <div className="bg-purple-100 p-4 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white"><Gamepad2 size={32} /></div>
                      <div>
                          <h4 className="text-xl font-black text-gray-800 font-fun">เกมแข่งขัน</h4>
                          <p className="text-sm text-gray-400 font-bold">ประลองความเร็วกับเพื่อนๆ ออนไลน์</p>
                      </div>
                  </button>

                  <div className="bg-white p-6 rounded-[40px] shadow-lg border-4 border-blue-50">
                      <h4 className="font-black text-gray-800 text-lg mb-4 flex items-center gap-2"><Star className="text-yellow-400 fill-yellow-400" size={20}/> เลือกวิชาฝึกฝน</h4>
                      {loadingSubjects ? <Loader2 className="animate-spin mx-auto text-blue-500"/> : (
                          <div className="grid grid-cols-2 gap-3">
                              {displaySubjects.map(sub => (
                                  <button key={sub.id} onClick={() => onSelectSubject(sub.name as Subject)} className="p-4 rounded-3xl bg-gray-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 transition-all flex flex-col items-center gap-2">
                                      <span className="text-4xl">{sub.icon}</span>
                                      <span className="text-sm font-black text-gray-700 truncate w-full text-center">{sub.name}</span>
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
