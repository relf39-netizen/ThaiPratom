
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
import RewardShop from './views/RewardShop';
import RTDashboard from './views/RTDashboard';
import RTReadingAloud from './views/RTReadingAloud';
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
  const [isMusicOn, setIsMusicOn] = useState(false);
  
  const [lastScore, setLastScore] = useState<{score: number, total: number, isHomework: boolean, isGame: boolean} | null>(null);
  const [gameRoomCode, setGameRoomCode] = useState<string>('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      try {
        const data = await fetchAppData();
        if (isMounted) {
          if (data.students && data.students.length > 0) {
             setStudents(data.students);
             setQuestions(data.questions || []);
             setExamResults(data.results || []);
             setAssignments(data.assignments || []);
          } else {
             setStudents(MOCK_STUDENTS);
             setQuestions(MOCK_QUESTIONS);
          }
        }
      } catch (error) {
          console.error("App Init Error", error);
      } finally {
          if (isMounted) setIsLoading(false);
      }
    };
    initData();
    return () => { isMounted = false; };
  }, []);

  const handleLogin = (student: Student) => { 
    setCurrentUser(student); 
    setCurrentPage('dashboard'); 
  };

  const handleTeacherLoginSuccess = (teacher: Teacher) => { 
    setCurrentTeacher(teacher); 
    setCurrentPage('teacher-dashboard'); 
  };

  const handleLogout = () => { 
      setCurrentUser(null); 
      setCurrentTeacher(null); 
      setCurrentPage('login'); 
      setSelectedSubject(null); 
      setCurrentAssignment(null);
  };

  const handleFinishExam = async (score: number, total: number, source: 'practice' | 'game' = 'practice') => {
    const isHomework = !!currentAssignment;
    const isGame = source === 'game';
    setLastScore({ score, total, isHomework, isGame });
    setCurrentPage('results');
    
    if (currentUser && !isGame) {
       const subjectToSave = currentAssignment ? currentAssignment.subject : (selectedSubject || 'รวมวิชา');
       await saveScore(currentUser.id, currentUser.name, currentUser.school || '-', score, total, subjectToSave as string, currentAssignment ? currentAssignment.id : undefined);
       setCurrentUser(prev => prev ? { ...prev, stars: prev.stars + score } : null);
       
       const newResult: ExamResult = { 
         id: Math.random().toString(), 
         studentId: currentUser.id, 
         subject: subjectToSave as Subject, 
         score, 
         totalQuestions: total, 
         timestamp: Date.now(), 
         assignmentId: currentAssignment?.id 
       };
       setExamResults(prev => [...prev, newResult]);
       setCurrentAssignment(null);
    }
  };

  const handleSelectSubject = (subject: Subject) => { 
    setSelectedSubject(subject); 
    setCurrentAssignment(null); 
    setCurrentPage('practice'); 
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-screen bg-white"><Loader2 className="animate-spin text-blue-600 mb-2" size={48} /><p className="font-bold text-gray-500">กำลังเข้าห้องเรียน...</p></div>;

  if (currentPage === 'teacher-login') return <TeacherLogin onLoginSuccess={handleTeacherLoginSuccess} onBack={() => setCurrentPage('login')} />;
  if (currentPage === 'teacher-dashboard' && currentTeacher) return <TeacherDashboard teacher={currentTeacher} onLogout={handleLogout} onStartGame={() => setCurrentPage('game-setup')} onAdminLoginAsStudent={handleLogin} />;
  if (currentPage === 'game-setup' && currentTeacher) return <GameSetup teacher={currentTeacher} onBack={() => setCurrentPage('teacher-dashboard')} onGameCreated={(code) => { setGameRoomCode(code); setCurrentPage('teacher-game'); }} />;
  if (currentPage === 'teacher-game' && currentTeacher) return <GameMode student={{ id: '99999', name: currentTeacher.name, avatar: '👨‍🏫', stars: 0 } as Student} initialRoomCode={gameRoomCode} onExit={() => setCurrentPage('teacher-dashboard')} />;
  
  if (currentPage === 'login' && !currentUser) return <Login onLogin={handleLogin} onTeacherLoginClick={() => setCurrentPage('teacher-login')} students={students} />;

  return (
    <Layout studentName={currentUser?.name} onLogout={handleLogout} isMusicOn={isMusicOn} toggleMusic={() => setIsMusicOn(!isMusicOn)} currentPage={currentPage} onNavigate={setCurrentPage}>
      {(() => {
        switch (currentPage) {
          case 'dashboard': 
            return <Dashboard student={currentUser!} assignments={assignments} examResults={examResults} onNavigate={setCurrentPage} onStartAssignment={(hw) => { setCurrentAssignment(hw); setSelectedSubject(hw.subject as Subject); setCurrentPage('practice'); }} onSelectSubject={handleSelectSubject} />;
          
          case 'rt-dashboard': 
            return <RTDashboard student={currentUser!} examResults={examResults} onBack={() => setCurrentPage('dashboard')} onNavigate={setCurrentPage} />;
          
          case 'rt-reading-aloud': 
            return <RTReadingAloud student={currentUser!} examResults={examResults} onBack={() => setCurrentPage('rt-dashboard')} onUpdateStars={(s) => setCurrentUser(prev => prev ? { ...prev, stars: s } : null)} />;
          
          case 'rt-comprehension':
            const rtCompQuestions = questions.filter(q => q.subject === Subject.RT_COMPREHENSION);
            return <PracticeMode questions={rtCompQuestions} onFinish={(s, t) => handleFinishExam(s, t)} onBack={() => setCurrentPage('rt-dashboard')} />;
          
          case 'rt-stats': 
            return <Stats examResults={examResults} student={currentUser!} onBack={() => setCurrentPage('rt-dashboard')} />;
          
          case 'shop': 
            return <RewardShop student={currentUser!} onBack={() => setCurrentPage('dashboard')} onUpdateStudent={(s) => setCurrentUser(s)} />;
          
          case 'practice':
            let qList = questions.filter(q => {
                const sGrade = (currentUser?.grade || 'P2').trim().toUpperCase();
                const qGrade = (q.grade || 'ALL').trim().toUpperCase();
                const activeSubject = currentAssignment ? currentAssignment.subject : selectedSubject;
                if (qGrade !== 'ALL' && qGrade !== sGrade) return false;
                if (activeSubject && String(activeSubject) !== String(q.subject)) return false;
                return true;
            });
            if (currentAssignment) qList = qList.sort(() => 0.5 - Math.random()).slice(0, currentAssignment.questionCount);
            return <PracticeMode questions={qList} onFinish={(s, t) => handleFinishExam(s, t)} onBack={() => setCurrentPage('dashboard')} />;
          
          case 'game': 
            return <GameMode student={currentUser!} onExit={() => setCurrentPage('dashboard')} onFinish={(score, total) => handleFinishExam(score, total, 'game')} />;
          
          case 'results': 
            return <Results score={lastScore?.score || 0} total={lastScore?.total || 0} isHomework={lastScore?.isHomework} isGame={lastScore?.isGame} onRetry={() => setCurrentPage('dashboard')} onHome={() => setCurrentPage('dashboard')} />;
          
          case 'stats': 
            return <Stats examResults={examResults} student={currentUser!} onBack={() => setCurrentPage('dashboard')} />;
          
          default: 
            return <Dashboard student={currentUser!} assignments={assignments} examResults={examResults} onNavigate={setCurrentPage} onStartAssignment={(hw) => { setCurrentAssignment(hw); setSelectedSubject(hw.subject as Subject); setCurrentPage('practice'); }} onSelectSubject={handleSelectSubject} />;
        }
      })()}
    </Layout>
  );
};
export default App;
