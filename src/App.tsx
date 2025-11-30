
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './views/Login';
import TeacherLogin from './views/TeacherLogin';
import TeacherDashboard from './views/TeacherDashboard';
import Dashboard from './views/Dashboard';
import PracticeMode from './views/PracticeMode';
import SubjectSelection from './views/SubjectSelection'; 
import GameMode from './views/GameMode';
import GameSetup from './views/GameSetup';
import Results from './views/Results';
import Stats from './views/Stats';
import { Student, Question, Teacher, Subject, ExamResult, Assignment } from './types';
import { fetchAppData, saveScore } from './services/api';
import { Loader2 } from 'lucide-react';
import { MOCK_STUDENTS, MOCK_QUESTIONS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [currentPage, setCurrentPage] = useState('login'); 
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [isMusicOn, setIsMusicOn] = useState(true);
  
  // State to hold result data
  const [lastScore, setLastScore] = useState<{score: number, total: number, isHomework: boolean, isGame: boolean} | null>(null);
  
  // ✅ New State for Game PIN
  const [gameRoomCode, setGameRoomCode] = useState<string>('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      console.log("System Starting...");
      const safetyTimer = setTimeout(() => {
        if (isMounted && isLoading) {
          console.warn("Loading taking too long, switching to fallback data...");
          setStudents(MOCK_STUDENTS);
          setQuestions(MOCK_QUESTIONS);
          setIsLoading(false);
        }
      }, 5000);

      try {
        const data = await fetchAppData();
        if (isMounted) {
          clearTimeout(safetyTimer);
          // Only fallback if NO students found at all (likely empty DB or fetch fail)
          if (data.students && data.students.length > 0) {
             setStudents(data.students);
             setQuestions(data.questions || []);
             setExamResults(data.results || []);
             setAssignments(data.assignments || []);
          } else {
             // Fallback to Mocks
             setStudents(MOCK_STUDENTS);
             setQuestions(MOCK_QUESTIONS);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load data", error);
        if (isMounted) {
           setStudents(MOCK_STUDENTS);
           setQuestions(MOCK_QUESTIONS);
           setIsLoading(false);
        }
      }
    };
    initData();
    return () => { isMounted = false; };
  }, []);

  const handleLogin = (student: Student) => { setCurrentUser(student); setCurrentPage('dashboard'); };
  const handleTeacherLoginSuccess = (teacher: Teacher) => { setCurrentTeacher(teacher); setCurrentPage('teacher-dashboard'); };
  const handleLogout = () => { 
      setCurrentUser(null); 
      setCurrentTeacher(null); 
      setCurrentPage('login'); 
      setSelectedSubject(null); 
      setCurrentAssignment(null);
      setGameRoomCode(''); 
  };

  const handleFinishExam = async (score: number, total: number, source: 'practice' | 'game' = 'practice') => {
    const isHomework = !!currentAssignment;
    const isGame = source === 'game';
    setLastScore({ score, total, isHomework, isGame });
    setCurrentPage('results');
    
    if (currentUser) {
       // ✅ ถ้าเป็นเกม: ไม่บันทึกลง Sheet และไม่รวมใน Stats (แต่เพิ่มดาวให้เพื่อความสนุก)
       if (isGame) {
           setCurrentUser(prev => prev ? { ...prev, stars: prev.stars + score } : null);
           return; 
       }

       const subjectToSave = currentAssignment ? currentAssignment.subject : (selectedSubject || 'รวมวิชา');
       
       // บันทึกคะแนนลง Google Sheet
       await saveScore(
         currentUser.id, 
         currentUser.name, 
         currentUser.school || '-', 
         score, 
         total, 
         subjectToSave, 
         currentAssignment ? currentAssignment.id : undefined
       );
       
       // อัปเดตดาว
       setCurrentUser(prev => prev ? { ...prev, stars: prev.stars + score } : null);
       
       const newResult: ExamResult = { 
         id: Math.random().toString(), 
         studentId: currentUser.id, 
         subject: subjectToSave as Subject,
         score: score, 
         totalQuestions: total, 
         timestamp: Date.now(), 
         assignmentId: currentAssignment?.id 
       };
       setExamResults(prev => [...prev, newResult]);
       setCurrentAssignment(null);
    }
  };

  const handleSelectSubject = (subject: Subject) => { setSelectedSubject(subject); setCurrentAssignment(null); setCurrentPage('practice'); };
  const handleStartAssignment = (assignment: Assignment) => { setCurrentAssignment(assignment); setSelectedSubject(assignment.subject); setCurrentPage('practice'); };

  // ✅ เมื่อครูสร้างห้องเสร็จ
  const handleGameCreated = (roomCode: string) => {
      setGameRoomCode(roomCode);
      setCurrentPage('teacher-game');
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 text-blue-600">
      <Loader2 className="animate-spin mb-4" size={48} />
      <p className="text-lg font-bold">กำลังเตรียมข้อมูล...</p>
    </div>
  );

  if (currentPage === 'teacher-login') return <TeacherLogin onLoginSuccess={handleTeacherLoginSuccess} onBack={() => setCurrentPage('login')} />;
  if (currentPage === 'teacher-dashboard' && currentTeacher) return <TeacherDashboard teacher={currentTeacher} onLogout={handleLogout} onStartGame={() => setCurrentPage('game-setup')} />;
  
  if (currentPage === 'game-setup' && currentTeacher) return <GameSetup teacher={currentTeacher} onBack={() => setCurrentPage('teacher-dashboard')} onGameCreated={handleGameCreated} />;
  
  if (currentPage === 'teacher-game' && currentTeacher) {
      const teacherAsStudent: Student = { id: '99999', name: currentTeacher.name, school: currentTeacher.school, avatar: '👨‍🏫', stars: 0, grade: 'TEACHER' };
      return <GameMode student={teacherAsStudent} initialRoomCode={gameRoomCode} onExit={() => setCurrentPage('teacher-dashboard')} />;
  }
  
  if (currentPage === 'login' && !currentUser) return <Login onLogin={handleLogin} onTeacherLoginClick={() => setCurrentPage('teacher-login')} students={students} />;

  return (
    <Layout studentName={currentUser?.name} onLogout={handleLogout} isMusicOn={isMusicOn} toggleMusic={() => setIsMusicOn(!isMusicOn)} currentPage={currentPage} onNavigate={setCurrentPage}>
      {(() => {
        switch (currentPage) {
          case 'dashboard': return <Dashboard student={currentUser!} assignments={assignments} examResults={examResults} onNavigate={setCurrentPage} onStartAssignment={handleStartAssignment} onSelectSubject={handleSelectSubject} />;
          case 'select-subject': return <SubjectSelection onSelectSubject={handleSelectSubject} onBack={() => setCurrentPage('dashboard')} />;
          case 'practice':
            let qList = questions;
            const activeSubject = currentAssignment ? currentAssignment.subject : selectedSubject;

            if (currentUser) {
                const sGrade = (currentUser.grade || 'P2').trim().toUpperCase();
                const sSchool = (currentUser.school || '').trim();

                // ✅ IMPROVED FILTERING LOGIC (Robust)
                qList = questions.filter(q => {
                    // 1. School Check: Matches Student's School OR is 'CENTER'/'Admin' OR is Blank (Global)
                    const qSchool = (q.school || 'CENTER').trim(); 
                    const isGlobal = qSchool.toUpperCase() === 'CENTER' || qSchool.toUpperCase() === 'ADMIN' || qSchool === '';
                    const isMySchool = qSchool === sSchool;
                    
                    if (!isGlobal && !isMySchool) return false;

                    // 2. Grade Check: Matches Student's Grade OR is 'ALL'
                    const qGrade = (q.grade || 'ALL').trim().toUpperCase();
                    // Allow ALL, allow exact match
                    if (qGrade !== 'ALL' && qGrade !== sGrade) return false;

                    // 3. Subject Check (If selected)
                    // Normalize both strings to prevent whitespace issues
                    if (activeSubject) {
                        const subjA = String(activeSubject).trim();
                        const subjB = String(q.subject).trim();
                        if (subjA !== subjB) return false;
                    }
                    
                    return true;
                });
            }

            // ✅ Handle Assignment Limits (Shuffle & Slice)
            if (currentAssignment) {
                const shuffled = [...qList].sort(() => 0.5 - Math.random());
                if (currentAssignment.questionCount > 0 && currentAssignment.questionCount < shuffled.length) {
                    qList = shuffled.slice(0, currentAssignment.questionCount);
                } else {
                    qList = shuffled;
                }
            }

            return <PracticeMode questions={qList} onFinish={(s, t) => handleFinishExam(s, t, 'practice')} onBack={() => setCurrentPage('dashboard')} />;
          
          case 'game': 
            return (
                <GameMode 
                    student={currentUser!} 
                    onExit={() => setCurrentPage('dashboard')} 
                    onFinish={(score, total) => handleFinishExam(score, total, 'game')}
                />
            );
          
          case 'results': return <Results score={lastScore?.score || 0} total={lastScore?.total || 0} isHomework={lastScore?.isHomework} isGame={lastScore?.isGame} onRetry={() => setCurrentPage('select-subject')} onHome={() => setCurrentPage('dashboard')} />;
          case 'stats': return <Stats examResults={examResults} studentId={currentUser!.id} onBack={() => setCurrentPage('dashboard')} />;
          default: return <Dashboard student={currentUser!} assignments={assignments} examResults={examResults} onNavigate={setCurrentPage} onStartAssignment={handleStartAssignment} onSelectSubject={handleSelectSubject} />;
        }
      })()}
    </Layout>
  );
};
export default App;
