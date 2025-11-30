
import React, { useState, useEffect } from 'react';
import { Teacher, Student, Subject, Assignment, Question, SubjectDef } from '../types';
import { UserPlus, BarChart2, FileText, LogOut, Save, RefreshCw, Gamepad2, Calendar, Eye, CheckCircle, X, PlusCircle, Sparkles, Wand2, Library, ArrowLeft, GraduationCap, Trash2, Edit, UserCog, Clock, PenTool, Bot, Info, ExternalLink, ImageIcon } from 'lucide-react';
import { getTeacherDashboard, manageStudent, addAssignment, addQuestion, editQuestion, GOOGLE_SCRIPT_URL, deleteQuestion, deleteAssignment, getTeachers, manageTeacher } from '../services/api';
import { generateQuestionWithAI, GeneratedQuestion } from '../services/aiService';
import { getSchoolSubjects, addSubject, deleteSubject } from '../services/subjectService';

interface TeacherDashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onStartGame: () => void; 
}

const GRADE_OPTIONS = [
    { value: 'P1', label: 'ป.1', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'P2', label: 'ป.2', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'P3', label: 'ป.3', color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'P4', label: 'ป.4', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'P5', label: 'ป.5', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'P6', label: 'ป.6', color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6' 
};

const COLOR_OPTIONS = [
    { value: 'red', label: 'แดง', class: 'bg-red-100 text-red-700' },
    { value: 'yellow', label: 'เหลือง', class: 'bg-yellow-100 text-yellow-700' },
    { value: 'green', label: 'เขียว', class: 'bg-green-100 text-green-700' },
    { value: 'blue', label: 'ฟ้า', class: 'bg-blue-100 text-blue-700' },
    { value: 'purple', label: 'ม่วง', class: 'bg-purple-100 text-purple-700' },
    { value: 'pink', label: 'ชมพู', class: 'bg-pink-100 text-pink-700' },
    { value: 'orange', label: 'ส้ม', class: 'bg-orange-100 text-orange-700' },
];

const ICONS = ['📖', '📐', '🧬', '🎨', '🎵', '⚽', '🌍', '💻', '🧩', '📝'];

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher, onLogout, onStartGame }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'students' | 'subjects' | 'stats' | 'questions' | 'assignments' | 'teachers'>('menu');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Custom Subjects State
  const [schoolSubjects, setSchoolSubjects] = useState<SubjectDef[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubGrade, setNewSubGrade] = useState('P2');
  const [newSubColor, setNewSubColor] = useState('blue');
  const [newSubIcon, setNewSubIcon] = useState('📖');
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [viewingSubjectGrade, setViewingSubjectGrade] = useState<string | null>(null);

  // Student Form & Management State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAvatar, setNewStudentAvatar] = useState('👦');
  const [newStudentGrade, setNewStudentGrade] = useState('P2'); 
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [viewingGrade, setViewingGrade] = useState('');
  const [studentsInGrade, setStudentsInGrade] = useState<Student[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Teacher Management State
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherSchool, setNewTeacherSchool] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Question Bank State
  const [qBankSelectedGrade, setQBankSelectedGrade] = useState<string | null>(null);
  const [showManualQForm, setShowManualQForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null); 
  const [qSubject, setQSubject] = useState<string>(''); // Dynamic Subject
  const [qGrade, setQGrade] = useState('P2'); 
  const [qText, setQText] = useState('');
  const [qImage, setQImage] = useState('');
  const [qChoices, setQChoices] = useState({c1:'', c2:'', c3:'', c4:''});
  const [qCorrect, setQCorrect] = useState('1');
  const [qExplain, setQExplain] = useState('');
  
  const [qBankSubject, setQBankSubject] = useState<string | null>(null); 
  const [showMyQuestionsOnly, setShowMyQuestionsOnly] = useState(false); 

  // AI Generator State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiInstructions, setAiInstructions] = useState(''); 
  const [aiGrade, setAiGrade] = useState('P2');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState<GeneratedQuestion[]>([]);
  
  // AI Assignment Options
  const [aiCreateAssignment, setAiCreateAssignment] = useState(false);
  const [aiDeadline, setAiDeadline] = useState('');

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      targetId: string;
      type: 'STUDENT' | 'ASSIGNMENT' | 'QUESTION' | 'SUBJECT' | 'TEACHER';
  }>({
      isOpen: false,
      title: '',
      message: '',
      targetId: '',
      type: 'STUDENT'
  });

  const normalizeId = (id: any) => id ? String(id).trim() : '';
  const isAdmin = teacher.username?.toLowerCase() === 'admin' || teacher.role === 'ADMIN' || teacher.role === 'admin';

  useEffect(() => {
    loadData();
    loadSubjects();
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGeminiApiKey(savedKey);
  }, []);

  useEffect(() => {
      // Auto-set grade in form when viewing a grade
      if (viewingSubjectGrade) {
          setNewSubGrade(viewingSubjectGrade);
      }
  }, [viewingSubjectGrade]);

  const loadData = async () => {
    setLoading(true);
    const data = await getTeacherDashboard(teacher.school);
    const myStudents = (data.students || []).filter((s: Student) => {
        if (s.school !== teacher.school) return false;
        return true; 
    });
    setStudents(myStudents);
    setStats(data.results || []);
    setAssignments(data.assignments || []); 
    setQuestions(data.questions || []); 
    setLoading(false);
  };

  const loadSubjects = async () => {
      setSubjectLoading(true);
      // Fetch custom subjects from database
      const customSubjects = await getSchoolSubjects(teacher.school);
      setSchoolSubjects(customSubjects);
      setSubjectLoading(false);
  };

  const loadTeachers = async () => {
     setIsProcessing(true);
     setProcessingMessage('กำลังโหลดข้อมูลครู...');
     const list = await getTeachers();
     setTeachersList(list);
     setIsProcessing(false);
  };

  const handleAddSubject = async () => {
      if (!newSubName) return alert('กรุณากรอกชื่อวิชา');
      setSubjectLoading(true);
      const success = await addSubject(teacher.school, newSubName, newSubGrade, newSubColor, newSubIcon);
      if (success) {
          alert('เพิ่มวิชาเรียบร้อยแล้ว');
          setNewSubName('');
          loadSubjects();
      } else {
          alert('เกิดข้อผิดพลาดในการบันทึก');
      }
      setSubjectLoading(false);
  };

  const verifyDataChange = async (checkFn: (students: Student[]) => boolean) => {
      for (let i = 0; i < 5; i++) { 
          await new Promise(r => setTimeout(r, 1500)); 
          const data = await getTeacherDashboard(teacher.school);
          const allSchoolStudents = (data.students || []).filter((s: Student) => s.school === teacher.school);
          if (checkFn(allSchoolStudents)) return allSchoolStudents; 
      }
      return null; 
  };

  const openDeleteModal = (targetId: string, type: 'STUDENT' | 'ASSIGNMENT' | 'QUESTION' | 'SUBJECT' | 'TEACHER') => {
      let title = '', message = '';
      if (type === 'STUDENT') { title = 'ยืนยันลบนักเรียน'; message = 'ข้อมูลคะแนนจะหายไปด้วย'; }
      if (type === 'ASSIGNMENT') { title = 'ยืนยันลบการบ้าน'; message = 'ข้อมูลการส่งงานจะหายไป'; }
      if (type === 'QUESTION') { title = 'ยืนยันลบข้อสอบ'; message = 'ลบออกจากคลังข้อสอบ'; }
      if (type === 'SUBJECT') { title = 'ยืนยันลบรายวิชา'; message = 'วิชานี้จะหายไปจากหน้านักเรียน'; }
      if (type === 'TEACHER') { title = 'ยืนยันลบข้อมูลครู'; message = 'บัญชีนี้จะไม่สามารถเข้าสู่ระบบได้'; }

      setDeleteModal({ isOpen: true, title, message, targetId, type });
  };

  const handleConfirmDelete = async () => {
      const { targetId, type } = deleteModal;
      setDeleteModal({ ...deleteModal, isOpen: false });

      if (type === 'SUBJECT') {
          await deleteSubject(teacher.school, targetId);
          loadSubjects();
      } else if (type === 'STUDENT') {
          setIsProcessing(true);
          setProcessingMessage('กำลังลบข้อมูล...');
          await manageStudent({ action: 'delete', id: targetId });
          const updated = await verifyDataChange(list => !list.some(s => s.id === targetId));
          setIsProcessing(false);
          setStudents(prev => updated?.filter(s => s.school === teacher.school) || prev.filter(s => s.id !== targetId));
          alert('✅ ลบข้อมูลสำเร็จ');
      } else if (type === 'ASSIGNMENT') {
          await deleteAssignment(targetId);
          setAssignments(prev => prev.filter(a => a.id !== targetId));
          alert('✅ ลบการบ้านสำเร็จ');
      } else if (type === 'QUESTION') {
          await deleteQuestion(targetId);
          setQuestions(prev => prev.filter(q => q.id !== targetId));
          alert('✅ ลบข้อสอบสำเร็จ');
      } else if (type === 'TEACHER') {
          setIsProcessing(true);
          setProcessingMessage('กำลังลบข้อมูลครู...');
          const result = await manageTeacher({ action: 'delete', id: targetId });
          if (result.success) {
              setTeachersList(prev => prev.filter(t => String(t.id) !== String(targetId)));
              alert('✅ ลบข้อมูลสำเร็จ');
          } else {
              alert('เกิดข้อผิดพลาดในการลบ');
          }
          setIsProcessing(false);
      }
  };

  const handleEditStudent = (s: Student) => {
      setShowGradeModal(false);
      setEditingStudentId(s.id);
      setNewStudentName(s.name);
      setNewStudentAvatar(s.avatar);
      setNewStudentGrade(s.grade || 'P2');
      setActiveTab('students');
      setTimeout(() => document.getElementById('student-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSaveStudent = async () => {
      if (!newStudentName) return alert("กรุณากรอกชื่อนักเรียน");
      const currentTeacherId = normalizeId(teacher.id);
      
      setIsSaving(true);
      const action = editingStudentId ? 'edit' : 'add';
      
      let nextId = '10001';
      if (!editingStudentId && students.length > 0) {
           const ids = students.map(s => parseInt(s.id)).filter(n => !isNaN(n));
           if (ids.length > 0) nextId = String(Math.max(...ids) + 1);
      }
      
      const payload = {
          action,
          id: editingStudentId || nextId,
          name: newStudentName,
          school: teacher.school,
          avatar: newStudentAvatar,
          grade: newStudentGrade,
          teacherId: currentTeacherId
      };

      try {
          const res = await manageStudent(payload as any);
          if (res.success || res.rawError) { 
             if (editingStudentId) {
                 setStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, name: newStudentName, avatar: newStudentAvatar, grade: newStudentGrade, teacherId: currentTeacherId } : s));
                 setEditingStudentId(null);
             } else {
                 const newStudent: Student = { id: nextId, name: newStudentName, school: teacher.school, avatar: newStudentAvatar, grade: newStudentGrade, stars: 0, teacherId: currentTeacherId };
                 setStudents(prev => [...prev, newStudent]);
                 setCreatedStudent(newStudent);
             }
             setNewStudentName('');
             alert('✅ บันทึกข้อมูลสำเร็จ');
          } else {
             alert('บันทึกไม่สำเร็จ');
          }
      } catch (e) {
          alert('Connection Error');
      } finally {
          setIsSaving(false);
      }
  };

  const handleEditTeacher = (t: Teacher) => {
      setEditingTeacherId(String(t.id));
      setNewTeacherName(t.name);
      setNewTeacherUsername(t.username || '');
      setNewTeacherPassword(t.password || '');
      setNewTeacherSchool(t.school);
      // Scroll to form if needed
      document.getElementById('teacher-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveTeacher = async () => {
      if (!newTeacherName || !newTeacherUsername || !newTeacherPassword || !newTeacherSchool) {
          return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      }

      setIsSaving(true);
      const action = editingTeacherId ? 'edit' : 'add';

      const result = await manageTeacher({
          action,
          id: editingTeacherId || undefined,
          name: newTeacherName,
          username: newTeacherUsername,
          password: newTeacherPassword,
          school: newTeacherSchool
      });

      if (result.success) {
          alert('✅ บันทึกข้อมูลครูสำเร็จ');
          // Refresh list
          loadTeachers();
          // Reset Form
          setNewTeacherName('');
          setNewTeacherUsername('');
          setNewTeacherPassword('');
          setNewTeacherSchool('');
          setEditingTeacherId(null);
      } else {
          alert('บันทึกไม่สำเร็จ: ' + (result.message || 'Unknown error'));
      }
      setIsSaving(false);
  };
  
  const handleEditQuestion = (q: Question) => {
      // Force manual form open
      setShowManualQForm(true);
      setEditingQuestionId(q.id);
      setQSubject(q.subject);
      setQGrade(q.grade || 'P2');
      setQText(q.text);
      setQImage(q.image || '');
      setQCorrect(String(q.correctChoiceId));
      setQExplain(q.explanation);
      
      const choices = { c1: '', c2: '', c3: '', c4: '' };
      q.choices.forEach((c, idx) => {
          if (idx === 0) choices.c1 = c.text;
          if (idx === 1) choices.c2 = c.text;
          if (idx === 2) choices.c3 = c.text;
          if (idx === 3) choices.c4 = c.text;
      });
      setQChoices(choices);
      // Ensure we are in the right grade view if editing from a mixed list (edge case)
      if (qBankSelectedGrade !== (q.grade || 'P2')) {
          setQBankSelectedGrade(q.grade || 'P2');
      }
      document.getElementById('question-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveQuestion = async () => {
    if (!qText || !qChoices.c1 || !qSubject) return alert('กรุณากรอกข้อมูลให้ครบถ้วน และเลือกวิชา');
    const tid = normalizeId(teacher.id);

    setIsProcessing(true);
    setProcessingMessage(editingQuestionId ? 'กำลังบันทึกการแก้ไข...' : 'กำลังบันทึกข้อสอบ...');
    
    // Use the grade from the form (which defaults to qBankSelectedGrade)
    const questionPayload = { 
        id: editingQuestionId, 
        subject: qSubject, 
        grade: qGrade, 
        text: qText, 
        image: qImage, 
        c1: qChoices.c1, c2: qChoices.c2, c3: qChoices.c3, c4: qChoices.c4, 
        correct: qCorrect, 
        explanation: qExplain, 
        school: teacher.school,
        teacherId: tid
    };

    let success = editingQuestionId ? await editQuestion(questionPayload) : await addQuestion(questionPayload);
    setIsProcessing(false);

    if (success) { 
        alert('✅ บันทึกข้อสอบเรียบร้อยแล้ว'); 
        setEditingQuestionId(null); 
        setQText(''); 
        setQImage('');
        setQChoices({c1:'', c2:'', c3:'', c4:''}); 
        setShowManualQForm(false); // Close form after save
        await loadData(); 
    } else { 
        alert('บันทึกไม่สำเร็จ'); 
    }
  };

  const handleAiGenerate = async () => {
    if (!geminiApiKey) return alert("กรุณากรอก API Key");
    if (!qSubject) return alert("กรุณาเลือกวิชา");
    
    localStorage.setItem('gemini_api_key', geminiApiKey);
    setIsGeneratingAi(true);
    try {
        const results = await generateQuestionWithAI(qSubject, aiGrade, aiInstructions, geminiApiKey, 5);
        if (results && results.length > 0) {
            setDraftQuestions(prev => [...prev, ...results]);
        } else {
            alert("ไม่สามารถสร้างโจทย์ได้ในขณะนี้");
        }
    } catch (e: any) {
        alert("Error: " + e.message);
    } finally {
        setIsGeneratingAi(false);
    }
  };

  const handleSaveDraftQuestions = async () => {
     if (draftQuestions.length === 0) return;
     if (aiCreateAssignment && !aiDeadline) return alert("กรุณาระบุวันกำหนดส่ง");
     if (!qSubject) return alert("กรุณาเลือกวิชา");

     const tid = normalizeId(teacher.id);
     setIsProcessing(true);
     let successCount = 0;
     
     for (const q of draftQuestions) {
        setProcessingMessage(`กำลังบันทึก...`);
        const success = await addQuestion({
            subject: qSubject,
            grade: aiGrade,
            text: q.text,
            image: q.image || '',
            c1: q.c1, c2: q.c2, c3: q.c3, c4: q.c4,
            correct: q.correct,
            explanation: q.explanation || '',
            school: teacher.school,
            teacherId: tid
        });
        if (success) successCount++;
     }

     if (aiCreateAssignment && successCount > 0) {
         setProcessingMessage(`กำลังสร้างการบ้าน...`);
         await addAssignment(teacher.school, aiTopic, aiGrade, successCount, aiDeadline, teacher.name);
     }

     setIsProcessing(false);
     setDraftQuestions([]); setAiTopic(''); setShowAiModal(false);
     alert(`✅ บันทึก ${successCount} ข้อเรียบร้อย`);
     await loadData();
  };
  
  // Calculate counts helper
  const getQuestionCount = (subjectName: string | null) => {
      const currentTid = normalizeId(teacher.id);
      return questions.filter(q => {
          // Grade Filter
          if ((q.grade || 'P2') !== qBankSelectedGrade) return false;
          
          // Ownership Filter
          if (showMyQuestionsOnly) {
              if (normalizeId(q.teacherId) !== currentTid) return false;
          } else {
              if (q.school !== teacher.school && q.school !== 'CENTER' && q.school !== 'Admin') return false;
          }
          
          // Subject Filter
          if (subjectName && q.subject !== subjectName) return false;
          
          return true;
      }).length;
  };
  
  // Filtered Questions for Bank
  const filteredQuestions = (() => {
      const currentTid = normalizeId(teacher.id);
      
      let filtered = questions;

      // 1. Filter by Grade (If selected)
      if (qBankSelectedGrade) {
          filtered = filtered.filter(q => (q.grade || 'P2') === qBankSelectedGrade);
      }

      // 2. Filter by "My Questions" or "All"
      if (showMyQuestionsOnly) {
          filtered = filtered.filter(q => normalizeId(q.teacherId) === currentTid);
      } else {
          // Show School + Center + Admin
          filtered = filtered.filter(q => q.school === teacher.school || q.school === 'CENTER' || q.school === 'Admin');
      }

      // 3. Filter by Subject
      if (qBankSubject) {
          filtered = filtered.filter(q => q.subject === qBankSubject);
      }

      return filtered;
  })();

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 relative">
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center text-white">
             <RefreshCw size={48} className="animate-spin mb-4" />
             <p>{processingMessage}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-b-3xl md:rounded-3xl shadow-lg mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap size={28} /> ห้องพักครู
            {isAdmin && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full border border-red-400 shadow-sm">Admin</span>}
          </h2>
          <div className="opacity-90 text-sm mt-1">{teacher.school} • คุณครู{teacher.name}</div>
        </div>
        <button onClick={onLogout} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition backdrop-blur-sm"><LogOut size={20} /></button>
      </div>

      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
            <MenuCard icon={<UserPlus size={40} />} title="จัดการนักเรียน" desc="ลงทะเบียนนักเรียน ป.1-6" color="bg-purple-50 text-purple-600 border-purple-200" onClick={() => setActiveTab('students')} />
            <MenuCard icon={<Library size={40} />} title="จัดการรายวิชา" desc="สร้างวิชาเรียนเอง" color="bg-indigo-50 text-indigo-600 border-indigo-200" onClick={() => { setActiveTab('subjects'); loadSubjects(); }} />
            
            {/* Show Teacher Management Only for Admin */}
            {isAdmin && (
                <MenuCard icon={<UserCog size={40} />} title="จัดการข้อมูลครู" desc="เพิ่ม/แก้ไข บัญชีครู" color="bg-teal-50 text-teal-600 border-teal-200" onClick={() => { setActiveTab('teachers'); loadTeachers(); }} />
            )}
            
            <MenuCard icon={<Calendar size={40} />} title="สั่งการบ้าน" desc="มอบหมายงานให้นักเรียน" color="bg-orange-50 text-orange-600 border-orange-200" onClick={() => { setActiveTab('assignments'); loadSubjects(); }} />
            <MenuCard icon={<BarChart2 size={40} />} title="ดูผลคะแนน" desc="สถิติการสอบ" color="bg-green-50 text-green-600 border-green-200" onClick={() => setActiveTab('stats')} />
            <MenuCard icon={<FileText size={40} />} title="คลังข้อสอบ" desc="เพิ่มและจัดการข้อสอบ" color="bg-blue-50 text-blue-600 border-blue-200" onClick={() => { setActiveTab('questions'); loadSubjects(); }} />
            <MenuCard icon={<Gamepad2 size={40} />} title="จัดกิจกรรมเกม" desc="เปิดห้องแข่งขัน Real-time" color="bg-pink-50 text-pink-600 border-pink-200" onClick={onStartGame} />
        </div>
      )}

      {activeTab !== 'menu' && (
        <div className="bg-white rounded-3xl shadow-sm p-4 md:p-6 min-h-[400px] relative animate-fade-in">
            <button onClick={() => { setActiveTab('menu'); setQBankSelectedGrade(null); setViewingSubjectGrade(null); }} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-purple-600 font-bold transition-colors"><div className="bg-gray-100 p-2 rounded-full"><ArrowLeft size={20} /></div> กลับเมนูหลัก</button>
            
            {/* TEACHER MANAGEMENT TAB - ADMIN ONLY */}
            {activeTab === 'teachers' && isAdmin && (
                <div className="grid md:grid-cols-2 gap-8">
                    <div id="teacher-form">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">{editingTeacherId ? 'แก้ไขข้อมูลครู' : 'เพิ่มบัญชีครูใหม่'}</h3>
                        <div className="bg-teal-50 p-6 rounded-2xl border border-teal-200">
                             <div className="mb-4">
                                 <label className="block text-sm font-medium text-gray-600 mb-2">ชื่อ-นามสกุล</label>
                                 <input type="text" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} className="w-full p-3 border rounded-xl bg-white" placeholder="เช่น คุณครูใจดี"/>
                             </div>
                             <div className="mb-4">
                                 <label className="block text-sm font-medium text-gray-600 mb-2">โรงเรียน</label>
                                 <input type="text" value={newTeacherSchool} onChange={e => setNewTeacherSchool(e.target.value)} className="w-full p-3 border rounded-xl bg-white" placeholder="ระบุชื่อโรงเรียน"/>
                             </div>
                             <div className="mb-4">
                                 <label className="block text-sm font-medium text-gray-600 mb-2">Username (สำหรับเข้าสู่ระบบ)</label>
                                 <input type="text" value={newTeacherUsername} onChange={e => setNewTeacherUsername(e.target.value)} className="w-full p-3 border rounded-xl bg-white" placeholder="username"/>
                             </div>
                             <div className="mb-6">
                                 <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
                                 <input type="text" value={newTeacherPassword} onChange={e => setNewTeacherPassword(e.target.value)} className="w-full p-3 border rounded-xl bg-white" placeholder="password"/>
                             </div>
                             <button onClick={handleSaveTeacher} disabled={isSaving} className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50">
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                             </button>
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-gray-500">รายชื่อครูทั้งหมด</h4>
                            <button onClick={loadTeachers} className="text-teal-600 hover:bg-teal-50 p-1 rounded"><RefreshCw size={14}/></button>
                        </div>
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                             {teachersList.length === 0 ? (
                                 <div className="p-10 text-center text-gray-400">ไม่พบข้อมูลครู</div>
                             ) : (
                                 <table className="w-full text-sm text-left">
                                     <thead className="bg-gray-50 text-gray-600">
                                         <tr><th className="p-3">ชื่อ</th><th className="p-3">โรงเรียน</th><th className="p-3">จัดการ</th></tr>
                                     </thead>
                                     <tbody>
                                         {teachersList.map((t) => (
                                             <tr key={t.id} className="border-b hover:bg-gray-50 last:border-0">
                                                 <td className="p-3 font-bold text-gray-800">
                                                     {t.name}
                                                     <div className="text-xs text-gray-400 font-normal">@{t.username}</div>
                                                 </td>
                                                 <td className="p-3 text-gray-600">{t.school}</td>
                                                 <td className="p-3 flex gap-2">
                                                     <button onClick={() => handleEditTeacher(t)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                                     <button onClick={() => openDeleteModal(String(t.id), 'TEACHER')} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* SUBJECT MANAGEMENT TAB */}
            {activeTab === 'subjects' && (
                <div className="max-w-4xl mx-auto">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
                        <Library className="text-indigo-600"/> จัดการรายวิชา
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* FORM */}
                        <div className="md:col-span-1 bg-gray-50 p-6 rounded-2xl border border-gray-200 h-fit">
                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><PlusCircle size={18} /> เพิ่มวิชาใหม่</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อวิชา</label>
                                    <input type="text" value={newSubName} onChange={e=>setNewSubName(e.target.value)} className="w-full p-3 border rounded-xl bg-white" placeholder="เช่น คณิตศาสตร์พื้นฐาน"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ระดับชั้น</label>
                                    <select value={newSubGrade} onChange={e=>setNewSubGrade(e.target.value)} className="w-full p-3 border rounded-xl bg-white">
                                        {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">สีประจำวิชา</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_OPTIONS.map(c => (
                                            <button 
                                                key={c.value} 
                                                onClick={() => setNewSubColor(c.value)}
                                                className={`w-8 h-8 rounded-full border-2 ${c.class.split(' ')[0]} ${newSubColor === c.value ? 'ring-2 ring-offset-2 ring-gray-400 border-black' : 'border-transparent'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">ไอคอน</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {ICONS.map(ic => (
                                            <button key={ic} onClick={()=>setNewSubIcon(ic)} className={`text-xl p-1 rounded hover:bg-gray-200 ${newSubIcon === ic ? 'bg-white shadow-sm ring-1 ring-indigo-300' : ''}`}>{ic}</button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={handleAddSubject} disabled={subjectLoading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                                    {subjectLoading ? '...' : 'บันทึกรายวิชา'}
                                </button>
                            </div>
                        </div>

                        {/* LIST */}
                        <div className="md:col-span-2">
                            {!viewingSubjectGrade ? (
                                <>
                                    <h4 className="font-bold text-gray-600 mb-4">เลือกดูตามระดับชั้น</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {GRADE_OPTIONS.map(g => {
                                            const count = schoolSubjects.filter(s => s.grade === g.value).length;
                                            return (
                                                <button 
                                                    key={g.value} 
                                                    onClick={() => setViewingSubjectGrade(g.value)}
                                                    className={`p-5 rounded-2xl border-2 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2 bg-white ${g.color} group`}
                                                >
                                                    <span className="text-3xl font-black group-hover:scale-110 transition-transform">{g.label}</span>
                                                    <span className="text-xs font-bold bg-white/50 px-2 py-0.5 rounded border border-black/5">{count} วิชา</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                            รายวิชาชั้น {GRADE_LABELS[viewingSubjectGrade]}
                                            <span className="bg-gray-100 text-gray-500 text-sm px-2 py-0.5 rounded-full">{schoolSubjects.filter(s => s.grade === viewingSubjectGrade).length}</span>
                                        </h4>
                                        <button onClick={() => setViewingSubjectGrade(null)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 font-bold">
                                            <ArrowLeft size={16}/> เลือกชั้นอื่น
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {schoolSubjects.filter(s => s.grade === viewingSubjectGrade).length === 0 ? (
                                            <div className="col-span-full text-center py-10 text-gray-400 border-2 border-dashed rounded-xl bg-gray-50">
                                                ยังไม่มีวิชาในระดับชั้นนี้
                                            </div>
                                        ) : (
                                            schoolSubjects.filter(s => s.grade === viewingSubjectGrade).map(s => (
                                                <div key={s.id} className={`p-4 rounded-2xl border flex items-center justify-between bg-white shadow-sm hover:shadow-md transition`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-${s.color}-100 text-${s.color}-600`}>
                                                            {s.icon}
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-gray-800 text-lg">{s.name}</h5>
                                                        </div>
                                                    </div>
                                                    {s.school === teacher.school && (
                                                        <button onClick={() => openDeleteModal(s.id, 'SUBJECT')} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div id="student-form">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{editingStudentId ? 'แก้ไขข้อมูลนักเรียน' : 'ลงทะเบียนนักเรียนใหม่'}</h3>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                      <label className="block text-sm font-medium text-gray-600 mb-2">ชื่อ-นามสกุล</label>
                      <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="w-full p-3 border rounded-xl mb-4 bg-white" placeholder="ด.ช. มานะ อดทน" />
                      
                      <label className="block text-sm font-medium text-gray-600 mb-2">ระดับชั้น</label>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                            {GRADE_OPTIONS.map(g => (
                                <button key={g.value} onClick={() => setNewStudentGrade(g.value)} className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition ${newStudentGrade === g.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'bg-white text-gray-500 border-gray-100'}`}>
                                    {g.label}
                                </button>
                            ))}
                      </div>
                      
                      <label className="block text-sm font-medium text-gray-600 mb-2">รูปแทนตัว</label>
                      <div className="flex gap-2 mb-6 overflow-x-auto py-1">{['👦','👧','🧒','🧑','👓','🦄','🦁','🐼'].map(emoji => (<button key={emoji} onClick={() => setNewStudentAvatar(emoji)} className={`text-2xl p-2 rounded-lg border-2 transition ${newStudentAvatar === emoji ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:bg-gray-200'}`}>{emoji}</button>))}</div>
                      
                      <button onClick={handleSaveStudent} disabled={isSaving || !newStudentName} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50">
                          {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 mb-4">รายชื่อนักเรียน ({students.length})</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {GRADE_OPTIONS.map(g => {
                            const count = students.filter(s => (s.grade || 'P2') === g.value).length;
                            return (
                                <button key={g.value} onClick={() => { setViewingGrade(g.value); setStudentsInGrade(students.filter(s => (s.grade||'P2') === g.value)); setShowGradeModal(true); }} className={`p-5 rounded-2xl border-2 shadow-sm hover:shadow-lg flex flex-col items-center justify-center gap-2 ${g.color} bg-white`}>
                                    <h3 className="text-3xl font-black">{g.label}</h3>
                                    <span className="text-sm font-bold opacity-80">{count} คน</span>
                                </button>
                            );
                        })}
                    </div>
                  </div>
                </div>
            )}
            
            {/* ASSIGNMENTS TAB */}
            {activeTab === 'assignments' && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-md text-white mb-8">
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><Sparkles className="text-yellow-300" /> สร้างการบ้านด้วย AI</h2>
                        <button onClick={() => { setAiCreateAssignment(true); setShowAiModal(true); setAiInstructions(''); setDraftQuestions([]); }} className="mt-4 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 flex items-center gap-2">
                            <Wand2 size={20} /> เริ่มสร้างแบบฝึกหัด
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {assignments.slice().reverse().map((a) => (
                             <div key={a.id} onClick={() => setSelectedAssignment(a)} className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md cursor-pointer">
                                 <h4 className="font-bold text-gray-800 line-clamp-1">{a.subject}</h4>
                                 <div className="flex gap-2 mb-2">
                                     <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{GRADE_LABELS[a.grade||'P2']}</span>
                                     <div className="text-xs text-gray-400">{formatDate(a.deadline)}</div>
                                 </div>
                                 <div className="flex justify-between items-end">
                                     <span className="font-bold text-orange-600">{a.questionCount} ข้อ</span>
                                     <button onClick={(e)=>{e.stopPropagation(); openDeleteModal(a.id, 'ASSIGNMENT')}} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>
            )}

            {/* QUESTIONS TAB - RESTRUCTURED */}
            {activeTab === 'questions' && (
               <div className="max-w-6xl mx-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> คลังข้อสอบ
                        {qBankSelectedGrade && <span className="bg-gray-100 px-2 py-0.5 rounded-lg text-sm text-gray-600">ชั้น {GRADE_LABELS[qBankSelectedGrade]}</span>}
                      </h3>
                      {qBankSelectedGrade && (
                        <button onClick={() => setQBankSelectedGrade(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold flex items-center gap-1">
                            <ArrowLeft size={16} /> ย้อนกลับ
                        </button>
                      )}
                  </div>

                  {!qBankSelectedGrade ? (
                      // 1. Grade Selection Grid
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {GRADE_OPTIONS.map(g => {
                             const qCount = questions.filter(q => (q.grade || 'P2') === g.value && (q.school === teacher.school || q.school === 'CENTER')).length;
                             return (
                                <button key={g.value} onClick={() => { setQBankSelectedGrade(g.value); setQGrade(g.value); setQBankSubject(null); setShowManualQForm(false); }} className={`p-8 rounded-3xl border-2 hover:shadow-xl transition-all flex flex-col items-center gap-4 ${g.color} bg-white`}>
                                    <div className="text-4xl font-black">{g.label}</div>
                                    <span className="bg-white/50 px-3 py-1 rounded-full text-xs font-bold border border-black/5">{qCount} ข้อสอบ</span>
                                </button>
                             )
                          })}
                      </div>
                  ) : (
                      // 2. Specific Grade View
                      <div>
                          {/* Creation Actions */}
                          <div className="grid md:grid-cols-2 gap-4 mb-8">
                             <button onClick={() => { setAiCreateAssignment(false); setAiGrade(qBankSelectedGrade); setShowAiModal(true); setAiInstructions(''); setDraftQuestions([]); }} className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3">
                                 <div className="bg-white/20 p-3 rounded-full"><Sparkles size={32} className="text-yellow-300"/></div>
                                 <div className="text-center">
                                     <h4 className="text-xl font-bold">สร้างด้วย AI</h4>
                                     <p className="text-white/80 text-sm">สร้างโจทย์อัตโนมัติ รวดเร็ว</p>
                                 </div>
                             </button>
                             <button onClick={() => { setShowManualQForm(!showManualQForm); setQGrade(qBankSelectedGrade); setEditingQuestionId(null); setQText(''); setQImage(''); setQChoices({c1:'',c2:'',c3:'',c4:''}); }} className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${showManualQForm ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 hover:border-blue-300 text-gray-700'}`}>
                                 <div className={`p-3 rounded-full ${showManualQForm ? 'bg-blue-200' : 'bg-gray-100'}`}><PenTool size={32}/></div>
                                 <div className="text-center">
                                     <h4 className="text-xl font-bold">สร้างด้วยตนเอง</h4>
                                     <p className="text-gray-500 text-sm">พิมพ์โจทย์และตัวเลือกเอง</p>
                                 </div>
                             </button>
                          </div>

                          {/* Manual Form (Conditional) */}
                          {showManualQForm && (
                              <div id="question-form" className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 mb-8 animate-fade-in relative">
                                  <button onClick={() => setShowManualQForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X/></button>
                                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                      {editingQuestionId ? '✏️ แก้ไขข้อสอบ' : '📝 เพิ่มข้อสอบใหม่'}
                                  </h4>
                                  
                                  <div className="mb-4">
                                      <label className="block text-xs font-bold text-gray-500 mb-1">วิชา</label>
                                      <select value={qSubject} onChange={(e)=>setQSubject(e.target.value)} className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-200">
                                          <option value="">-- เลือกวิชา --</option>
                                          {schoolSubjects.filter(s => s.grade === qBankSelectedGrade).map(s => {
                                              const count = questions.filter(q => q.subject === s.name && (q.grade || 'P2') === qBankSelectedGrade && (q.school === teacher.school || q.school === 'CENTER')).length;
                                              return <option key={s.name} value={s.name}>{s.name} (มี {count} ข้อ)</option>
                                          })}
                                      </select>
                                  </div>
                                  
                                  <div className="mb-4">
                                     <textarea value={qText} onChange={(e)=>setQText(e.target.value)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-200" rows={3} placeholder="พิมพ์โจทย์คำถามที่นี่..."></textarea>
                                  </div>

                                  <div className="mb-4">
                                      <label className="block text-xs font-bold text-gray-500 mb-1">ลิงก์รูปภาพ (ถ้ามี)</label>
                                      <div className="flex gap-2 items-center">
                                          <input 
                                            type="text" 
                                            value={qImage} 
                                            onChange={(e)=>setQImage(e.target.value)} 
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 text-sm" 
                                            placeholder="วางลิงก์รูปภาพที่นี่ (https://...)"
                                          />
                                          {qImage && (
                                              <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center overflow-hidden flex-shrink-0">
                                                  <img src={qImage} alt="preview" className="w-full h-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                     {['ก', 'ข', 'ค', 'ง'].map((label, idx) => (
                                         <div key={idx} className="relative">
                                             <span className="absolute left-3 top-2.5 text-gray-400 font-bold">{label}.</span>
                                             <input 
                                                type="text" 
                                                value={idx===0?qChoices.c1:idx===1?qChoices.c2:idx===2?qChoices.c3:qChoices.c4} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setQChoices(prev => ({
                                                        ...prev, 
                                                        [idx===0?'c1':idx===1?'c2':idx===2?'c3':'c4']: val
                                                    }));
                                                }}
                                                className="w-full p-2 pl-8 border rounded-lg focus:border-blue-500"
                                                placeholder={`ตัวเลือก ${label}`}
                                             />
                                         </div>
                                     ))}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 mb-6">
                                     <div>
                                         <label className="text-xs font-bold text-gray-500">ข้อที่ถูก</label>
                                         <select value={qCorrect} onChange={(e)=>setQCorrect(e.target.value)} className="w-full p-2 border rounded-lg bg-white"><option value="1">ก</option><option value="2">ข</option><option value="3">ค</option><option value="4">ง</option></select>
                                     </div>
                                     <div>
                                         <label className="text-xs font-bold text-gray-500">คำอธิบายเฉลย</label>
                                         <input type="text" value={qExplain} onChange={(e)=>setQExplain(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="อธิบายให้นักเรียนเข้าใจ"/>
                                     </div>
                                  </div>
            
                                  <div className="flex gap-2">
                                      <button onClick={handleSaveQuestion} disabled={isProcessing} className="w-full py-3 rounded-xl font-bold shadow text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">
                                         {isProcessing ? <RefreshCw className="animate-spin"/> : <Save size={20}/>}
                                         {editingQuestionId ? 'บันทึกการแก้ไข' : 'บันทึกข้อสอบ'}
                                      </button>
                                  </div>
                              </div>
                          )}

                          {/* Filters */}
                          <div className="mb-6 overflow-x-auto pb-2">
                              <div className="flex gap-2">
                                  <button onClick={() => setQBankSubject(null)} className={`px-4 py-2 rounded-xl whitespace-nowrap font-bold text-sm border ${!qBankSubject ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>
                                      ทั้งหมด ({getQuestionCount(null)})
                                  </button>
                                  {schoolSubjects.filter(s => s.grade === qBankSelectedGrade).map(sub => {
                                     const count = getQuestionCount(sub.name);
                                     return (
                                     <button 
                                         key={sub.name}
                                         onClick={() => setQBankSubject(sub.name)}
                                         className={`px-4 py-2 rounded-xl whitespace-nowrap font-bold text-sm border flex items-center gap-2 ${qBankSubject === sub.name ? `bg-${sub.color}-100 text-${sub.color}-700 border-${sub.color}-300` : 'bg-white text-gray-600 border-gray-200'}`}
                                     >
                                         <span>{sub.icon}</span> {sub.name} <span className="text-xs opacity-70">({count})</span>
                                     </button>
                                  )})}
                              </div>
                          </div>

                          {/* Question List */}
                          <h4 className="font-bold text-gray-600 mb-4 flex justify-between items-center">
                              <span>รายการข้อสอบ ({filteredQuestions.length})</span>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">เฉพาะของฉัน</span>
                                  <button 
                                    onClick={() => setShowMyQuestionsOnly(!showMyQuestionsOnly)}
                                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${showMyQuestionsOnly ? 'bg-blue-500' : 'bg-gray-300'}`}
                                  >
                                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showMyQuestionsOnly ? 'translate-x-4' : ''}`}></div>
                                  </button>
                              </div>
                          </h4>
                          
                          {filteredQuestions.length > 0 ? (
                              <div className="grid gap-3">
                                {filteredQuestions.map((q, idx) => (
                                   <div key={q.id} className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow flex justify-between items-start group">
                                       <div className="flex-1">
                                           <div className="flex gap-2 mb-1">
                                               <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{q.subject}</span>
                                               {q.school === 'CENTER' && <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">ส่วนกลาง</span>}
                                           </div>
                                           <p className="font-bold text-gray-800 mb-1">{q.text}</p>
                                           <div className="text-xs text-gray-400 grid grid-cols-2 gap-x-4 gap-y-1 w-fit">
                                               {q.choices.map((c, i) => (
                                                   <span key={i} className={`${(i+1).toString() === q.correctChoiceId ? 'text-green-600 font-bold' : ''}`}>{['ก','ข','ค','ง'][i]}. {c.text}</span>
                                               ))}
                                           </div>
                                       </div>
                                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button onClick={()=>handleEditQuestion(q)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                           <button onClick={()=>openDeleteModal(q.id, 'QUESTION')} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                       </div>
                                   </div>
                                ))}
                              </div>
                          ) : (
                              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-400">
                                  <FileText className="mx-auto mb-2 opacity-20" size={48} />
                                  <p>ยังไม่มีข้อสอบในหมวดนี้</p>
                              </div>
                          )}
                      </div>
                  )}
               </div>
            )}

            {/* STATS TAB */}
            {activeTab === 'stats' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">ผลการเรียนของนักเรียน ({students.length} คน)</h3>
                  <button onClick={loadData} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-gray-600 flex items-center gap-1"><RefreshCw size={14}/> รีเฟรช</button>
                </div>
                {loading ? <div className="text-center py-10 text-gray-400">กำลังโหลด...</div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-purple-50 text-purple-900 border-b border-purple-100">
                        <tr><th className="p-4 rounded-tl-xl w-20 text-center">รูป</th><th className="p-4">ข้อมูลนักเรียน</th><th className="p-4 text-center">ระดับชั้น</th><th className="p-4 rounded-tr-xl text-right">ดาวสะสม</th></tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                            <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-3 text-center"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto">{s.avatar || '👤'}</div></td>
                              <td className="p-3 align-middle"><div className="font-bold text-gray-900 text-base mb-1">{s.name}</div><span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">ID: {s.id}</span></td>
                              <td className="p-3 text-center align-middle"><span className="px-2 py-1 rounded-full text-xs bg-gray-100 border border-gray-200">{GRADE_LABELS[s.grade||'P2']}</span></td>
                              <td className="p-3 text-right align-middle"><span className="text-xl font-bold text-yellow-500">⭐ {s.stars}</span></td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* AI MODAL */}
      {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-fade-in flex flex-col max-h-[90vh]">
                  <div className="bg-indigo-600 p-4 text-white flex justify-between items-center rounded-t-2xl">
                      <h3 className="font-bold flex items-center gap-2"><Sparkles size={20} className="text-yellow-300"/> สร้างด้วย AI</h3>
                      <button onClick={()=>setShowAiModal(false)}><X size={20}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                      <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-blue-800 border border-blue-100">
                          <p className="font-bold flex items-center gap-1"><Info size={16}/> วิธีรับ API Key:</p>
                          <ol className="list-decimal list-inside ml-1 mt-1 space-y-1">
                              <li>ไปที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">Google AI Studio <ExternalLink size={12}/></a></li>
                              <li>กดปุ่ม "Create API key"</li>
                              <li>คัดลอกรหัสมาวางในช่องด้านล่าง</li>
                          </ol>
                      </div>

                      <div className="mb-4">
                          <input type="password" value={geminiApiKey} onChange={(e)=>setGeminiApiKey(e.target.value)} className="w-full p-2 border rounded-lg text-sm mb-2 focus:ring-2 focus:ring-indigo-300 outline-none" placeholder="วาง API Key ที่นี่ (เริ่มต้นด้วย AIza...)"/>
                          
                          <div className="grid grid-cols-2 gap-4 mb-2">
                              <div>
                                  <label className="block text-xs font-bold mb-1">ระดับชั้น</label>
                                  <div className="w-full p-2 border rounded-lg bg-gray-100 text-gray-500 font-bold">{GRADE_LABELS[aiGrade]}</div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold mb-1">วิชา</label>
                                  <select value={qSubject} onChange={(e)=>setQSubject(e.target.value)} className="w-full p-2 border rounded-lg">
                                      <option value="">-- เลือกวิชา --</option>
                                      {schoolSubjects.filter(s => s.grade === aiGrade).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                  </select>
                              </div>
                          </div>
                          
                          {aiCreateAssignment && (
                             <div className="mb-2">
                                 <input type="text" value={aiTopic} onChange={e=>setAiTopic(e.target.value)} className="w-full p-2 border rounded-lg mb-2" placeholder="ชื่อการบ้าน (เช่น แบบฝึกหัดที่ 1)"/>
                                 <input type="date" value={aiDeadline} onChange={e=>setAiDeadline(e.target.value)} className="w-full p-2 border rounded-lg"/>
                             </div>
                          )}

                          <textarea value={aiInstructions} onChange={e=>setAiInstructions(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="คำสั่งเพิ่มเติมให้ AI (เช่น ขอโจทย์ยากๆ)" rows={2}></textarea>
                      </div>

                      {/* Draft List */}
                      {draftQuestions.length > 0 && (
                          <div className="bg-gray-50 p-2 rounded-lg mb-4 max-h-60 overflow-y-auto border border-gray-200">
                              {draftQuestions.map((q,i) => (
                                  <div key={i} className="text-xs border-b p-3 bg-white rounded mb-2 shadow-sm">
                                      <div className="flex justify-between items-start mb-2">
                                          <span className="font-bold text-gray-700 flex-1">{i+1}. {q.text}</span>
                                          <button onClick={()=>setDraftQuestions(draftQuestions.filter((_,idx)=>idx!==i))} className="text-red-500 hover:bg-red-50 p-1 rounded ml-2"><X size={14}/></button>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 mt-2">
                                          <label className="whitespace-nowrap font-bold text-gray-500 flex items-center gap-1"><ImageIcon size={12}/> รูปภาพ:</label>
                                          <input 
                                            type="text" 
                                            value={q.image || ''} 
                                            onChange={(e) => {
                                                const newDrafts = [...draftQuestions];
                                                newDrafts[i].image = e.target.value;
                                                setDraftQuestions(newDrafts);
                                            }}
                                            className="flex-1 p-1.5 border rounded bg-gray-50 text-gray-600 focus:bg-white focus:ring-1 focus:ring-blue-200 transition-colors"
                                            placeholder="วางลิงก์รูปภาพ..."
                                          />
                                      </div>
                                      {q.image && <img src={q.image} className="mt-2 h-20 object-contain rounded border bg-white" alt="AI Gen" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                                  </div>
                              ))}
                          </div>
                      )}

                      <div className="flex gap-2">
                          <button onClick={handleAiGenerate} disabled={isGeneratingAi} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition disabled:opacity-50">
                              {isGeneratingAi ? 'กำลังสร้าง...' : `สร้าง 5 ข้อ`}
                          </button>
                          {draftQuestions.length > 0 && (
                              <button onClick={handleSaveDraftQuestions} disabled={isProcessing} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2">
                                  <Save size={18}/> บันทึกข้อสอบ ({draftQuestions.length})
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showGradeModal && (
         <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-md p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">นักเรียนชั้น {GRADE_LABELS[viewingGrade]}</h3>
                    <button onClick={()=>setShowGradeModal(false)}><X/></button>
                 </div>
                 <div className="max-h-60 overflow-y-auto space-y-2">
                     {studentsInGrade.map(s => (
                         <div key={s.id} className="flex justify-between items-center border p-2 rounded-lg">
                             <div className="flex items-center gap-2">
                                 <span className="text-xl">{s.avatar}</span>
                                 <span>{s.name}</span>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={()=>handleEditStudent(s)} className="text-blue-500"><Edit size={16}/></button>
                                 <button onClick={()=>openDeleteModal(s.id, 'STUDENT')} className="text-red-500"><Trash2 size={16}/></button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         </div>
      )}
      
      {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full">
                  <h3 className="font-bold text-lg mb-2">{deleteModal.title}</h3>
                  <p className="text-gray-500 mb-6">{deleteModal.message}<br/><span className="text-red-500 font-bold">ยืนยันการลบ?</span></p>
                  <div className="flex gap-2">
                      <button onClick={()=>setDeleteModal({...deleteModal, isOpen:false})} className="flex-1 py-2 bg-gray-100 rounded-lg">ยกเลิก</button>
                      <button onClick={handleConfirmDelete} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold">ลบ</button>
                  </div>
              </div>
          </div>
      )}

      {selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-fade-in">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Calendar size={20} className="text-blue-600"/> รายละเอียดการส่งงาน</h3>
                      <button onClick={() => setSelectedAssignment(null)} className="text-gray-400 hover:text-red-500 transition"><X size={24}/></button>
                  </div>
                  <div className="p-4 bg-blue-50 border-b">
                      <div className="font-bold text-blue-900 text-lg">{selectedAssignment.subject} ({selectedAssignment.questionCount} ข้อ)</div>
                      <div className="text-sm text-blue-700 mt-1">กำหนดส่ง: <b>{selectedAssignment.deadline}</b></div>
                  </div>
                  <div className="overflow-y-auto p-4 flex-1 bg-gray-50">
                      <table className="w-full text-sm text-left bg-white rounded-xl shadow-sm">
                          <thead>
                              <tr className="text-gray-600 border-b bg-gray-100"><th className="p-3 rounded-tl-xl">ชื่อนักเรียน</th><th className="p-3 text-center">สถานะ</th><th className="p-3 text-right">คะแนน</th><th className="p-3 text-right rounded-tr-xl">เวลาที่ส่ง</th></tr>
                          </thead>
                          <tbody>
                              {students.filter(s => (s.grade || 'P2') === (selectedAssignment.grade || 'ALL') || selectedAssignment.grade === 'ALL').map(s => {
                                  const result = stats.filter(r => r.assignmentId === selectedAssignment.id && String(r.studentId) === String(s.id)).pop();
                                  return (
                                      <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                                          <td className="p-3 font-bold text-gray-800 flex items-center gap-2">
                                              <span className="text-xl">{s.avatar}</span> {s.name}
                                          </td>
                                          <td className="p-3 text-center">
                                              {result ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto border border-green-200"><CheckCircle size={12}/> ส่งแล้ว</span> : <span className="text-gray-500 flex items-center justify-center gap-1 text-xs"><Clock size={12}/> ยังไม่ส่ง</span>}
                                          </td>
                                          <td className="p-3 text-right font-bold text-blue-700">{result ? <span className="text-lg">{result.score}</span> : '-'}</td>
                                          <td className="p-3 text-right text-gray-600 text-xs">
                                              {result ? new Date(result.timestamp).toLocaleString('th-TH') : '-'}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

const MenuCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; color: string; onClick: () => void }> = ({ icon, title, desc, color, onClick }) => (
    <button onClick={onClick} className={`p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 shadow-sm hover:shadow-md flex flex-col items-start gap-3 ${color} bg-white`}>
        <div className="p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm">{icon}</div>
        <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-xs opacity-80 font-medium">{desc}</p>
        </div>
    </button>
);

export default TeacherDashboard;
