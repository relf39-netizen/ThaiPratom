
import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, Student, Subject, Assignment, Question, SubjectDef } from '../types';
import { UserPlus, BarChart2, FileText, LogOut, Save, RefreshCw, Gamepad2, Calendar, Eye, CheckCircle, X, PlusCircle, Sparkles, Wand2, Library, ArrowLeft, GraduationCap, Trash2, Edit, UserCog, PenTool, Clock, TrendingUp, Trophy, Activity, Users, PieChart, Search, Filter, Mic, BookOpen } from 'lucide-react';
import { getTeacherDashboard, manageStudent, addAssignment, addQuestion, editQuestion, deleteQuestion, deleteAssignment, getTeachers, manageTeacher, getRTReadingData, manageRTReading } from '../services/api';
import { generateQuestionWithAI, generateRTReadingWithAI, generateRTComprehensionWithAI, GeneratedQuestion } from '../services/aiService';
import { getSchoolSubjects, addSubject, deleteSubject } from '../services/subjectService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TeacherDashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onStartGame: () => void;
  // Added onAdminLoginAsStudent to fix type mismatch in App.tsx
  onAdminLoginAsStudent: (student: Student) => void;
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

// Added onAdminLoginAsStudent to destructuring props
const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher, onLogout, onStartGame, onAdminLoginAsStudent }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'students' | 'subjects' | 'stats' | 'questions' | 'assignments' | 'teachers' | 'rt'>('menu');
  const [statsTab, setStatsTab] = useState<'students' | 'subjects'>('students');
  const [statsGrade, setStatsGrade] = useState<string>('ALL'); 
  
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // 🦉 RT Management State
  const [rtSubTab, setRtSubTab] = useState<'reading' | 'comprehension'>('reading');
  const [rtItems, setRtItems] = useState<any[]>([]);
  const [rtReadingType, setRtReadingType] = useState<'WORD' | 'SENTENCE' | 'PASSAGE'>('WORD');
  const [rtCompPart, setRtCompPart] = useState<'MATCHING' | 'SENTENCE' | 'PASSAGE'>('MATCHING');
  const [newRtText, setNewRtText] = useState('');
  const [draftRTItems, setDraftRTItems] = useState<any[]>([]);
  
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
  const [qSubject, setQSubject] = useState<string>(''); 
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

  // Assignment Form State
  const [assignSubject, setAssignSubject] = useState<string>(Object.values(Subject)[0] || 'คณิตศาสตร์');
  const [assignGrade, setAssignGrade] = useState('ALL'); 
  const [assignCount, setAssignCount] = useState(10);
  const [assignDeadline, setAssignDeadline] = useState('');

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [viewingStudentDetail, setViewingStudentDetail] = useState<Student | null>(null); 

  const [deleteModal, setDeleteModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      targetId: string;
      type: 'STUDENT' | 'ASSIGNMENT' | 'QUESTION' | 'SUBJECT' | 'TEACHER' | 'RT';
  }>({
      isOpen: false,
      title: '',
      message: '',
      targetId: '',
      type: 'STUDENT'
  });

  const normalizeId = (id: any) => id ? String(id).trim() : '';
  const isAdmin = teacher.username?.toLowerCase() === 'admin' || teacher.role === 'ADMIN' || teacher.role === 'admin';

  const filteredStatistics = useMemo(() => {
      const targetStudents = students.filter(s => statsGrade === 'ALL' || (s.grade || 'P2') === statsGrade);
      const targetStudentIds = new Set(targetStudents.map(s => s.id));
      const targetResults = stats.filter(r => targetStudentIds.has(r.studentId));
      const subjectStats: Record<string, { attempts: number, totalScore: number, totalQuestions: number, name: string }> = {};
      
      targetResults.forEach(result => {
          if (!subjectStats[result.subject]) {
              subjectStats[result.subject] = { name: result.subject, attempts: 0, totalScore: 0, totalQuestions: 0 };
          }
          subjectStats[result.subject].attempts += 1;
          subjectStats[result.subject].totalScore += result.score;
          subjectStats[result.subject].totalQuestions += result.totalQuestions;
      });

      const subjectsData = Object.values(subjectStats).map(s => ({
          ...s,
          avgScore: s.totalQuestions > 0 ? Math.round((s.totalScore / s.totalQuestions) * 100) : 0
      }));

      let mostPopular = null;
      let bestPerformance = null;

      if (subjectsData.length > 0) {
          mostPopular = subjectsData.reduce((prev, current) => (prev.attempts > current.attempts) ? prev : current);
          const qualifiedForBest = subjectsData.filter(s => s.attempts >= 3);
          if (qualifiedForBest.length > 0) {
              bestPerformance = qualifiedForBest.reduce((prev, current) => (prev.avgScore > current.avgScore) ? prev : current);
          } else {
              bestPerformance = subjectsData.reduce((prev, current) => (prev.avgScore > current.avgScore) ? prev : current);
          }
      }

      return {
          subjectsData,
          mostPopular,
          bestPerformance,
          activeStudents: new Set(targetResults.map(s => s.studentId)).size,
          totalStudents: targetStudents.length,
          filteredStudents: targetStudents
      };
  }, [stats, students, statsGrade]);

  useEffect(() => {
    loadData();
    loadSubjects();
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGeminiApiKey(savedKey);
  }, []);

  useEffect(() => {
      if (viewingSubjectGrade) {
          setNewSubGrade(viewingSubjectGrade);
      }
  }, [viewingSubjectGrade]);

  useEffect(() => {
    if (activeTab === 'rt') {
        loadRtData();
    }
  }, [activeTab, rtSubTab, rtReadingType]);

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

  const loadRtData = async () => {
    const data = await getRTReadingData(teacher.school, rtSubTab === 'reading' ? rtReadingType : undefined);
    setRtItems(data);
  };

  const handleAddRTItem = async () => {
    if (!newRtText) return;
    setIsProcessing(true);
    setProcessingMessage('กำลังบันทึก...');
    await manageRTReading('add', {
        text: newRtText,
        type: rtReadingType,
        grade: 'P1',
        school: teacher.school,
        teacher_id: normalizeId(teacher.id)
    });
    setNewRtText('');
    await loadRtData();
    setIsProcessing(false);
  };

  const loadSubjects = async () => {
      setSubjectLoading(true);
      const customSubjects = await getSchoolSubjects(teacher.school);
      setSchoolSubjects(customSubjects);
      setSubjectLoading(false);
  };

  const loadTeachers = async () => {
     setIsProcessing(true);
     setProcessingMessage('กำลังโหลดข้อมูลครู...');
     const list = await getTeachers(teacher.school);
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

  const openDeleteModal = (targetId: string, type: 'STUDENT' | 'ASSIGNMENT' | 'QUESTION' | 'SUBJECT' | 'TEACHER' | 'RT') => {
      let title = '', message = '';
      if (type === 'STUDENT') { title = 'ยืนยันลบนักเรียน'; message = 'ข้อมูลคะแนนจะหายไปด้วย'; }
      if (type === 'ASSIGNMENT') { title = 'ยืนยันลบการบ้าน'; message = 'ข้อมูลการส่งงานจะหายไป'; }
      if (type === 'QUESTION') { title = 'ยืนยันลบข้อสอบ'; message = 'ลบออกจากคลังข้อสอบ'; }
      if (type === 'SUBJECT') { title = 'ยืนยันลบรายวิชา'; message = 'วิชานี้จะหายไปจากหน้านักเรียน'; }
      if (type === 'TEACHER') { title = 'ยืนยันลบข้อมูลครู'; message = 'บัญชีนี้จะไม่สามารถเข้าสู่ระบบได้'; }
      if (type === 'RT') { title = 'ยืนยันลบข้อมูลการอ่าน'; message = 'ลบคำศัพท์นี้ออกจากคลัง'; }

      setDeleteModal({ isOpen: true, title, message, targetId, type });
  };

  const handleConfirmDelete = async () => {
      const { targetId, type } = deleteModal;
      setDeleteModal({ ...deleteModal, isOpen: false });
      setIsProcessing(true);
      setProcessingMessage('กำลังลบข้อมูล...');

      if (type === 'SUBJECT') {
          await deleteSubject(teacher.school, targetId);
          loadSubjects();
      } else if (type === 'STUDENT') {
          await manageStudent({ action: 'delete', id: targetId });
          await loadData();
      } else if (type === 'ASSIGNMENT') {
          await deleteAssignment(targetId);
          await loadData();
      } else if (type === 'QUESTION') {
          await deleteQuestion(targetId);
          await loadData();
      } else if (type === 'TEACHER') {
          await manageTeacher({ action: 'delete', id: targetId });
          await loadTeachers();
      } else if (type === 'RT') {
          await manageRTReading('delete', { id: targetId });
          await loadRtData();
      }
      
      setIsProcessing(false);
      alert('✅ ลบข้อมูลสำเร็จ');
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
      setIsSaving(true);
      const action = editingStudentId ? 'edit' : 'add';
      try {
          const res = await manageStudent({
              action,
              id: editingStudentId || undefined,
              name: newStudentName,
              school: teacher.school,
              avatar: newStudentAvatar,
              grade: newStudentGrade,
              teacherId: normalizeId(teacher.id)
          });
          if (res.success) { 
             if (!editingStudentId && res.student) setCreatedStudent(res.student);
             setEditingStudentId(null);
             setNewStudentName('');
             await loadData();
          } else {
             alert('บันทึกไม่สำเร็จ: ' + res.message);
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
      document.getElementById('teacher-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveTeacher = async () => {
      if (!newTeacherName || !newTeacherUsername || !newTeacherPassword || !newTeacherSchool) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      setIsSaving(true);
      const result = await manageTeacher({ action: editingTeacherId ? 'edit' : 'add', id: editingTeacherId || undefined, name: newTeacherName, username: newTeacherUsername, password: newTeacherPassword, school: newTeacherSchool });
      if (result) {
          alert('✅ บันทึกข้อมูลครูสำเร็จ');
          loadTeachers();
          setNewTeacherName(''); setNewTeacherUsername(''); setNewTeacherPassword(''); setNewTeacherSchool(''); setEditingTeacherId(null);
      } else {
          alert('บันทึกไม่สำเร็จ');
      }
      setIsSaving(false);
  };

  const handleCreateAssignment = async () => {
    if (!assignDeadline) return alert('กรุณาเลือกวันกำหนดส่ง');
    setIsSaving(true);
    const success = await addAssignment(teacher.school, assignSubject, assignGrade, assignCount, assignDeadline, teacher.name);
    if (success) {
      alert('✅ สั่งการบ้านเรียบร้อยแล้ว');
      setAssignDeadline('');
      await loadData();
    } else {
      alert('เกิดข้อผิดพลาดในการบันทึกการบ้าน');
    }
    setIsSaving(false);
  };
  
  const handleEditQuestion = (q: Question) => {
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
      if (qBankSelectedGrade !== (q.grade || 'P2')) {
          setQBankSelectedGrade(q.grade || 'P2');
      }
      document.getElementById('question-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveQuestion = async () => {
    if (!qText || !qChoices.c1 || !qSubject) return alert('กรุณากรอกข้อมูลให้ครบถ้วน และเลือกวิชา');
    setIsProcessing(true);
    setProcessingMessage(editingQuestionId ? 'กำลังบันทึกการแก้ไข...' : 'กำลังบันทึกข้อสอบ...');
    
    const questionPayload = { 
        id: editingQuestionId, subject: qSubject, grade: qGrade, text: qText, image: qImage, 
        c1: qChoices.c1, c2: qChoices.c2, c3: qChoices.c3, c4: qChoices.c4, 
        correct: qCorrect, explanation: qExplain, school: teacher.school, teacherId: normalizeId(teacher.id)
    };

    let success = editingQuestionId ? await editQuestion(editingQuestionId, questionPayload) : await addQuestion(questionPayload);
    if (success) { 
        alert('✅ บันทึกข้อสอบเรียบร้อยแล้ว'); 
        setEditingQuestionId(null); 
        setQText(''); setQImage(''); setQChoices({c1:'', c2:'', c3:'', c4:''}); 
        setShowManualQForm(false);
        await loadData(); 
    } else { 
        alert('บันทึกไม่สำเร็จ'); 
    }
    setIsProcessing(false);
  };

  const handleAiGenerate = async () => {
    if (!geminiApiKey) return alert("กรุณากรอก API Key");
    localStorage.setItem('gemini_api_key', geminiApiKey);
    setIsGeneratingAi(true);

    try {
        if (activeTab === 'rt') {
            if (rtSubTab === 'reading') {
                const results = await generateRTReadingWithAI(rtReadingType, aiInstructions, geminiApiKey, 20);
                setDraftRTItems(results);
            } else {
                const results = await generateRTComprehensionWithAI(rtCompPart, aiInstructions, geminiApiKey, 5);
                setDraftQuestions(results);
            }
        } else {
            if (!qSubject) return alert("กรุณาเลือกวิชา");
            const results = await generateQuestionWithAI(qSubject, aiGrade, aiInstructions, geminiApiKey, 5);
            setDraftQuestions(results);
        }
    } catch (e: any) {
        alert("Error: " + e.message);
    } finally {
        setIsGeneratingAi(false);
    }
  };

  const handleSaveDrafts = async () => {
     setIsProcessing(true);
     setProcessingMessage('กำลังบันทึกข้อมูลทั้งหมด...');
     let successCount = 0;

     try {
         // Handle RT Reading Aloud Drafts
         if (draftRTItems.length > 0) {
             for (const item of draftRTItems) {
                 const ok = await manageRTReading('add', {
                     text: item.text,
                     type: item.type,
                     grade: 'P1',
                     school: teacher.school,
                     teacher_id: normalizeId(teacher.id)
                 });
                 if (ok) successCount++;
             }
         }

         // Handle Question Drafts (General or RT Comprehension)
         if (draftQuestions.length > 0) {
             const isRTComp = activeTab === 'rt' && rtSubTab === 'comprehension';
             const targetSubject = isRTComp ? Subject.RT_COMPREHENSION : qSubject;
             const targetGrade = isRTComp ? 'P1' : aiGrade;

             for (const q of draftQuestions) {
                 const ok = await addQuestion({
                     subject: targetSubject,
                     grade: targetGrade,
                     text: q.text,
                     image: q.image || '',
                     c1: q.c1, c2: q.c2, c3: q.c3, c4: q.c4,
                     correct: q.correct,
                     explanation: q.explanation || '',
                     school: teacher.school,
                     teacherId: normalizeId(teacher.id),
                     rt_part: isRTComp ? rtCompPart : undefined
                 });
                 if (ok) successCount++;
             }

             if (aiCreateAssignment && successCount > 0) {
                 await addAssignment(teacher.school, targetSubject, targetGrade, successCount, aiDeadline, teacher.name);
             }
         }

         await loadData();
         if (activeTab === 'rt') await loadRtData();

         alert(`✅ บันทึกสำเร็จทั้งหมด ${successCount} รายการ`);
         setShowAiModal(false);
         setDraftQuestions([]);
         setDraftRTItems([]);
     } catch (err) {
         alert("ไม่สามารถบันทึกข้อมูลได้บางส่วน");
     } finally {
         setIsProcessing(false);
     }
  };
  
  const getQuestionCount = (subjectName: string | null) => {
      const currentTid = normalizeId(teacher.id);
      return questions.filter(q => {
          if ((q.grade || 'P2') !== qBankSelectedGrade) return false;
          if (showMyQuestionsOnly) {
              if (normalizeId(q.teacherId) !== currentTid) return false;
          } else {
              if (q.school !== teacher.school && q.school !== 'CENTER' && q.school !== 'Admin') return false;
          }
          if (subjectName && q.subject !== subjectName) return false;
          return true;
      }).length;
  };
  
  const filteredQuestions = useMemo(() => {
      const currentTid = normalizeId(teacher.id);
      let filtered = questions;
      if (qBankSelectedGrade) {
          filtered = filtered.filter(q => (q.grade || 'P2') === qBankSelectedGrade);
      }
      if (showMyQuestionsOnly) {
          filtered = filtered.filter(q => normalizeId(q.teacherId) === currentTid);
      } else {
          filtered = filtered.filter(q => q.school === teacher.school || q.school === 'CENTER' || q.school === 'Admin');
      }
      if (qBankSubject) {
          filtered = filtered.filter(q => q.subject === qBankSubject);
      }
      return filtered;
  }, [questions, qBankSelectedGrade, showMyQuestionsOnly, qBankSubject, teacher.school]);

  const filteredRTQuestions = useMemo(() => {
    return questions.filter(q => 
        q.subject === Subject.RT_COMPREHENSION && 
        (q.rt_part === rtCompPart || (!q.rt_part && rtCompPart === 'MATCHING'))
    );
  }, [questions, rtCompPart]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStudentActivity = (studentId: string) => {
      const studentResults = stats.filter(r => String(r.studentId) === String(studentId));
      return { totalExams: studentResults.length, lastExam: studentResults.length > 0 ? Math.max(...studentResults.map(r => r.timestamp)) : null };
  };

  const getStudentSubjectStats = (studentId: string) => {
      const studentResults = stats.filter(r => String(r.studentId) === String(studentId));
      const subjMap: Record<string, { totalScore: number, count: number }> = {};
      
      studentResults.forEach(r => {
          if (!subjMap[r.subject]) subjMap[r.subject] = { totalScore: 0, count: 0 };
          subjMap[r.subject].totalScore += (r.score / r.totalQuestions) * 100;
          subjMap[r.subject].count++;
      });

      return Object.entries(subjMap).map(([subject, data]) => ({
          subject,
          avg: Math.round(data.totalScore / data.count),
          count: data.count
      }));
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 relative">
      
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
             <RefreshCw size={48} className="animate-spin mb-4" />
             <p className="text-xl font-bold">{processingMessage}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0 animate-fade-in">
            <MenuCard icon={<UserPlus size={40} />} title="จัดการนักเรียน" desc="ลงทะเบียนนักเรียน ป.1-6" color="bg-purple-50 text-purple-600 border-purple-200" onClick={() => setActiveTab('students')} />
            <MenuCard icon={<Mic size={40} />} title="เตรียมสอบ RT ป.1" desc="คลังอ่านออกเสียง/รู้เรื่อง" color="bg-sky-50 text-sky-600 border-sky-200" onClick={() => setActiveTab('rt')} />
            <MenuCard icon={<Library size={40} />} title="จัดการรายวิชา" desc="สร้างวิชาเรียนเอง" color="bg-indigo-50 text-indigo-600 border-indigo-200" onClick={() => { setActiveTab('subjects'); loadSubjects(); }} />
            {isAdmin && (
                <MenuCard icon={<UserCog size={40} />} title="จัดการข้อมูลครู" desc="เพิ่ม/แก้ไข บัญชีครู" color="bg-teal-50 text-teal-600 border-teal-200" onClick={() => { setActiveTab('teachers'); loadTeachers(); }} />
            )}
            <MenuCard icon={<Calendar size={40} />} title="สั่งการบ้าน" desc="มอบหมายงานให้นักเรียน" color="bg-orange-50 text-orange-600 border-orange-200" onClick={() => { setActiveTab('assignments'); loadSubjects(); }} />
            <MenuCard icon={<BarChart2 size={40} />} title="สถิติคะแนนของนักเรียน" desc="สถิติการเข้าใช้งาน" color="bg-green-50 text-green-600 border-green-200" onClick={() => setActiveTab('stats')} />
            <MenuCard icon={<FileText size={40} />} title="คลังข้อสอบ" desc="เพิ่มและจัดการข้อสอบ" color="bg-blue-50 text-blue-600 border-blue-200" onClick={() => { setActiveTab('questions'); loadSubjects(); }} />
            <MenuCard icon={<Gamepad2 size={40} />} title="จัดกิจกรรมเกม" desc="เปิดห้องแข่งขัน Real-time" color="bg-pink-50 text-pink-600 border-pink-200" onClick={onStartGame} />
        </div>
      )}

      {activeTab !== 'menu' && (
        <div className="bg-white rounded-3xl shadow-sm p-4 md:p-6 min-h-[400px] relative animate-fade-in">
             <button onClick={() => { setActiveTab('menu'); setQBankSelectedGrade(null); setViewingSubjectGrade(null); }} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-purple-600 font-bold transition-colors"><div className="bg-gray-100 p-2 rounded-full"><ArrowLeft size={20} /></div> กลับเมนูหลัก</button>
             
            {/* 🦉 RT MANAGEMENT TAB */}
            {activeTab === 'rt' && (
                <div className="space-y-6">
                    <div className="flex gap-4 p-2 bg-gray-50 rounded-2xl w-fit">
                        <button onClick={() => setRtSubTab('reading')} className={`px-6 py-2 rounded-xl font-bold transition ${rtSubTab === 'reading' ? 'bg-sky-500 text-white shadow-md' : 'text-gray-400'}`}>1. การอ่านออกเสียง</button>
                        <button onClick={() => setRtSubTab('comprehension')} className={`px-6 py-2 rounded-xl font-bold transition ${rtSubTab === 'comprehension' ? 'bg-sky-500 text-white shadow-md' : 'text-gray-400'}`}>2. การอ่านรู้เรื่อง</button>
                    </div>

                    {rtSubTab === 'reading' ? (
                        <div className="grid md:grid-cols-3 gap-8 animate-fade-in">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-sky-100 h-fit">
                                <h4 className="font-bold text-gray-800 mb-4">เพิ่มคลังการอ่านออกเสียง</h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['WORD', 'SENTENCE', 'PASSAGE'] as const).map(t => (
                                            <button key={t} onClick={() => setRtReadingType(t)} className={`p-2 rounded-xl text-xs font-bold border-2 transition ${rtReadingType === t ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-400'}`}>
                                                {t === 'WORD' ? 'คำ' : t === 'SENTENCE' ? 'ประโยค' : 'ข้อความ'}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea value={newRtText} onChange={e=>setNewRtText(e.target.value)} className="w-full p-3 border rounded-xl" rows={3} placeholder="พิมพ์ข้อความ..."/>
                                    <button onClick={handleAddRTItem} className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold shadow-md hover:bg-sky-700">บันทึก</button>
                                    <button onClick={() => { setShowAiModal(true); setAiInstructions(''); setDraftQuestions([]); setDraftRTItems([]); }} className="w-full py-3 border-2 border-dashed border-sky-300 text-sky-600 rounded-xl font-bold flex items-center justify-center gap-2">
                                        <Wand2 size={18}/> ใช้ AI ช่วยสร้าง
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-gray-800">รายการในคลัง ({rtItems.length})</h4>
                                    <button onClick={loadRtData} className="text-sky-600 p-2 hover:bg-sky-50 rounded-full transition"><RefreshCw size={18}/></button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                    {rtItems.map(item => (
                                        <div key={item.id} className="p-3 bg-white border rounded-xl flex justify-between items-center group shadow-sm">
                                            <span className="font-bold text-gray-700">{item.text}</span>
                                            <button onClick={() => openDeleteModal(item.id, 'RT')} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                    {rtItems.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed rounded-3xl bg-gray-50">ยังไม่มีข้อมูลในคลัง</div>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-gradient-to-r from-sky-400 to-blue-500 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h4 className="text-xl font-bold">จัดการข้อสอบการอ่านรู้เรื่อง</h4>
                                    <p className="opacity-80 text-sm">แยกตามโครงสร้างข้อสอบ RT จริง</p>
                                </div>
                                <button onClick={() => { setShowAiModal(true); setAiInstructions(''); setDraftQuestions([]); setDraftRTItems([]); }} className="bg-white text-sky-600 px-6 py-2 rounded-xl font-bold shadow-sm hover:bg-sky-50 transition active:scale-95 flex items-center gap-2">
                                    <Sparkles size={18}/> สร้างด้วย AI
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
                                {(['MATCHING', 'SENTENCE', 'PASSAGE'] as const).map(p => (
                                    <button key={p} onClick={() => setRtCompPart(p)} className={`px-6 py-2 rounded-xl text-xs font-black transition ${rtCompPart === p ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:bg-gray-200'}`}>
                                        {p === 'MATCHING' ? 'ตอน 1: รู้เรื่องคำ' : p === 'SENTENCE' ? 'ตอน 2: รู้เรื่องประโยค' : 'ตอน 3: รู้เรื่องข้อความ'}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRTQuestions.length === 0 ? (
                                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed rounded-[40px] bg-gray-50">ยังไม่มีข้อสอบในหมวดนี้</div>
                                ) : (
                                    filteredRTQuestions.map(q => (
                                        <div key={q.id} className="bg-white border-2 border-gray-100 p-5 rounded-[32px] shadow-sm relative group hover:border-sky-200 transition-colors">
                                            {q.image && <img src={q.image} className="h-24 w-full object-contain rounded-2xl mb-3 bg-gray-50 p-2"/>}
                                            <p className="font-bold text-gray-800 text-sm line-clamp-3 leading-relaxed mb-4">{q.text}</p>
                                            <div className="space-y-1 opacity-60">
                                                {q.choices?.slice(0,3).map((c, i) => (
                                                    <div key={i} className={`text-xs ${c.id === q.correctChoiceId ? 'text-green-600 font-bold' : 'text-gray-500'}`}>• {c.text}</div>
                                                ))}
                                            </div>
                                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openDeleteModal(q.id, 'QUESTION')} className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

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
             
            {/* SUBJECTS TAB */}
            {activeTab === 'subjects' && (
                <div className="max-w-4xl mx-auto">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
                        <Library className="text-indigo-600"/> จัดการรายวิชา
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-8">
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
                                                        <button onClick={() => openDeleteModal(s.id!, 'SUBJECT')} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
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
                        <button onClick={() => { setAiCreateAssignment(true); setShowAiModal(true); setAiInstructions(''); setDraftQuestions([]); setDraftRTItems([]); }} className="mt-4 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 flex items-center gap-2">
                            <Wand2 size={20} /> เริ่มสร้างแบบฝึกหัด
                        </button>
                    </div>

                     <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="text-orange-500"/> สั่งงานใหม่ (Manual)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">ระดับชั้น</label>
                                <select value={assignGrade} onChange={(e) => setAssignGrade(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-orange-200 outline-none">
                                    <option value="ALL">ทุกระดับชั้น</option>
                                    {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">วิชา</label>
                                <select value={assignSubject} onChange={(e) => setAssignSubject(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-orange-200 outline-none">
                                    <option disabled>-- วิชาหลัก --</option>
                                    {Object.values(Subject).map((s) => <option key={s} value={s}>{s}</option>)}
                                    {schoolSubjects.length > 0 && <option disabled>-- วิชาเพิ่มเติม --</option>}
                                    {schoolSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">จำนวนข้อ</label>
                                <input type="number" value={assignCount} onChange={(e) => setAssignCount(Number(e.target.value))} className="w-full p-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-orange-200 outline-none" min="5" max="50" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">ส่งภายใน</label>
                                <input type="date" value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)} className="w-full p-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-orange-200 outline-none" />
                            </div>
                            <div className="flex items-end col-span-2 md:col-span-1">
                                <button onClick={handleCreateAssignment} disabled={isSaving} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold shadow hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 h-[42px]">
                                    {isSaving ? '...' : <><Save size={16}/> สั่งงาน</>}
                                </button>
                            </div>
                        </div>
                     </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {assignments.slice().reverse().map((a) => (
                             <div key={a.id} onClick={() => setSelectedAssignment(a)} className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md cursor-pointer">
                                 <h4 className="font-bold text-gray-800 line-clamp-1">{a.subject}</h4>
                                 <div className="flex gap-2 mb-2">
                                     <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{GRADE_LABELS[a.grade||'P2'] || (a.grade === 'ALL' ? 'ทุกชั้น' : a.grade)}</span>
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

            {/* QUESTIONS TAB */}
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
                      <div>
                          <div className="grid md:grid-cols-2 gap-4 mb-8">
                             <button onClick={() => { setAiCreateAssignment(false); setAiGrade(qBankSelectedGrade); setShowAiModal(true); setAiInstructions(''); setDraftQuestions([]); setDraftRTItems([]); }} className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3">
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
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                  <h3 className="text-lg font-bold text-gray-800">📊 สถิติคะแนนของนักเรียน</h3>
                  <button onClick={loadData} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-gray-600 flex items-center gap-1"><RefreshCw size={14}/> รีเฟรช</button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
                    <button 
                        onClick={() => setStatsGrade('ALL')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition whitespace-nowrap flex items-center gap-2 ${statsGrade === 'ALL' ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Filter size={16} /> ทุกระดับชั้น
                    </button>
                    {GRADE_OPTIONS.map(g => (
                        <button 
                            key={g.value}
                            onClick={() => setStatsGrade(g.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition whitespace-nowrap ${statsGrade === g.value ? `bg-white border-${g.color.split(' ')[0].replace('bg-','').replace('-50','')}-500 text-${g.color.split(' ')[1].replace('text-','').replace('-700','')}-700 shadow-md ring-2 ring-${g.color.split(' ')[0].replace('bg-','').replace('-50','')}-200` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button 
                        onClick={() => setStatsTab('students')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${statsTab === 'students' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Users size={32} />
                        <span className="font-bold text-lg">สถิตินักเรียน</span>
                    </button>
                    <button 
                        onClick={() => setStatsTab('subjects')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${statsTab === 'subjects' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                    >
                        <PieChart size={32} />
                        <span className="font-bold text-lg">สถิติรายวิชา</span>
                    </button>
                </div>

                {loading ? <div className="text-center py-10 text-gray-400">กำลังโหลด...</div> : (
                  <>
                    {statsTab === 'students' ? (
                        <div className="animate-fade-in">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4">
                                    <div className="bg-blue-200 p-3 rounded-full text-blue-700"><Users size={24}/></div>
                                    <div>
                                        <div className="text-2xl font-black text-blue-900">{filteredStatistics.totalStudents}</div>
                                        <div className="text-xs text-blue-600 font-bold uppercase">นักเรียนทั้งหมด</div>
                                    </div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-4">
                                    <div className="bg-green-200 p-3 rounded-full text-green-700"><Activity size={24}/></div>
                                    <div>
                                        <div className="text-2xl font-black text-green-900">{filteredStatistics.activeStudents}</div>
                                        <div className="text-xs text-green-600 font-bold uppercase">เคยเข้าใช้งาน</div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 w-20 text-center">รูป</th>
                                        <th className="p-4">ข้อมูลนักเรียน</th>
                                        <th className="p-4 text-center">ระดับชั้น</th>
                                        <th className="p-4 text-center">เข้าใช้งาน (ครั้ง)</th>
                                        <th className="p-4 text-center">ใช้งานล่าสุด</th>
                                        <th className="p-4 text-right">รายละเอียด</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStatistics.filteredStudents.length > 0 ? filteredStatistics.filteredStudents.map(s => {
                                        const { totalExams, lastExam } = getStudentActivity(s.id);
                                        return (
                                            <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors last:border-0">
                                                <td className="p-3 text-center"><div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl mx-auto">{s.avatar || '👤'}</div></td>
                                                <td className="p-3 align-middle">
                                                    <div className="font-bold text-gray-900 text-base mb-1">{s.name}</div>
                                                    <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">ID: {s.id}</span>
                                                </td>
                                                <td className="p-3 text-center align-middle"><span className="px-2 py-1 rounded-full text-xs bg-gray-100 border border-gray-200 text-gray-600 font-bold">{GRADE_LABELS[s.grade||'P2']}</span></td>
                                                <td className="p-3 text-center align-middle font-bold text-gray-700">
                                                    {totalExams > 0 ? totalExams : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="p-3 text-center align-middle text-gray-500 text-xs">
                                                    {lastExam ? new Date(lastExam).toLocaleDateString('th-TH') : '-'}
                                                </td>
                                                <td className="p-3 text-right align-middle">
                                                    <button onClick={() => setViewingStudentDetail(s)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1 ml-auto">
                                                        <Search size={14}/> ดูคะแนน
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">ไม่พบข้อมูลนักเรียนในระดับชั้นนี้</td></tr>
                                    )}
                                </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                    <TrendingUp className="absolute top-4 right-4 text-white/20" size={60} />
                                    <div className="relative z-10">
                                        <h4 className="text-sm font-bold text-indigo-100 uppercase mb-2">วิชายอดนิยม (เข้าใช้งานบ่อยสุด)</h4>
                                        <div className="text-3xl font-black mb-1">{filteredStatistics.mostPopular ? filteredStatistics.mostPopular.name : '-'}</div>
                                        <div className="bg-white/20 inline-block px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm">
                                            {filteredStatistics.mostPopular ? `${filteredStatistics.mostPopular.attempts} ครั้ง` : 'ไม่มีข้อมูล'}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                    <Trophy className="absolute top-4 right-4 text-white/20" size={60} />
                                    <div className="relative z-10">
                                        <h4 className="text-sm font-bold text-emerald-100 uppercase mb-2">คะแนนเฉลี่ยสูงสุด</h4>
                                        <div className="text-3xl font-black mb-1">{filteredStatistics.bestPerformance ? filteredStatistics.bestPerformance.name : '-'}</div>
                                        <div className="bg-white/20 inline-block px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm">
                                            {filteredStatistics.bestPerformance ? `เฉลี่ย ${filteredStatistics.bestPerformance.avgScore}%` : 'ไม่มีข้อมูล'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
                                <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><BarChart2 size={18}/> จำนวนการเข้าทำข้อสอบแยกตามวิชา {statsGrade !== 'ALL' && `(ชั้น ${GRADE_LABELS[statsGrade]})`}</h4>
                                {filteredStatistics.subjectsData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={filteredStatistics.subjectsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                                            <Bar dataKey="attempts" name="จำนวนครั้ง" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={40}>
                                                {filteredStatistics.subjectsData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#ec4899', '#f59e0b', '#10b981'][index % 4]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">ไม่มีข้อมูลสถิติในระดับชั้นนี้</div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                        <tr>
                                            <th className="p-4">วิชา</th>
                                            <th className="p-4 text-center">เข้าใช้งาน (ครั้ง)</th>
                                            <th className="p-4 text-right">คะแนนเฉลี่ย</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStatistics.subjectsData.map((sub, idx) => (
                                            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="p-4 font-bold text-gray-800">{sub.name}</td>
                                                <td className="p-4 text-center">
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold text-xs">{sub.attempts}</span>
                                                </td>
                                                <td className="p-4 text-right font-bold text-gray-700">{sub.avgScore}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                  </>
                )}
              </div>
            )}

        </div>
      )}

      {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-fade-in flex flex-col max-h-[90vh]">
                  <div className="bg-indigo-600 p-4 text-white flex justify-between items-center rounded-t-2xl">
                      <h3 className="font-bold flex items-center gap-2"><Sparkles size={20} className="text-yellow-300"/> สร้างด้วย AI</h3>
                      <button onClick={()=>setShowAiModal(false)}><X size={20}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                      <div className="mb-4">
                          <input type="password" value={geminiApiKey} onChange={(e)=>setGeminiApiKey(e.target.value)} className="w-full p-2 border rounded-lg text-sm mb-2 focus:ring-2 focus:ring-indigo-300 outline-none" placeholder="วาง API Key ที่นี่ (เริ่มต้นด้วย AIza...)"/>
                          
                          {activeTab === 'rt' && rtSubTab === 'comprehension' ? (
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                {(['MATCHING', 'SENTENCE', 'PASSAGE'] as const).map(t => (
                                    <button key={t} onClick={()=>setRtCompPart(t)} className={`p-2 rounded-xl text-xs font-bold border-2 transition ${rtCompPart === t ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-300'}`}>
                                        {t === 'MATCHING' ? '1. จับคู่ภาพ' : t === 'SENTENCE' ? '2. เติมคำ' : '3. อ่านข้อความ'}
                                    </button>
                                ))}
                            </div>
                          ) : activeTab === 'rt' && rtSubTab === 'reading' ? (
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {(['WORD', 'SENTENCE', 'PASSAGE'] as const).map(t => (
                                    <button key={t} onClick={()=>setRtReadingType(t)} className={`p-2 rounded-xl text-xs font-bold border-2 transition ${rtReadingType === t ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-300'}`}>
                                        {t === 'WORD' ? 'เป็นคำ' : t === 'SENTENCE' ? 'เป็นประโยค' : 'เป็นข้อความ'}
                                    </button>
                                ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <div>
                                    <label className="block text-xs font-bold mb-1">ระดับชั้น</label>
                                    <select value={aiGrade} onChange={(e)=>setAiGrade(e.target.value)} className="w-full p-2 border rounded-lg">
                                        {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">วิชา</label>
                                    <select value={qSubject} onChange={(e)=>setQSubject(e.target.value)} className="w-full p-2 border rounded-lg">
                                        <option value="">-- เลือกวิชา --</option>
                                        {schoolSubjects.filter(s => s.grade === aiGrade).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                          )}
                          
                          {aiCreateAssignment && (
                             <div className="mb-2">
                                 <input type="text" value={aiTopic} onChange={e=>setAiTopic(e.target.value)} className="w-full p-2 border rounded-lg mb-2" placeholder="ชื่อการบ้าน (เช่น แบบฝึกหัดที่ 1)"/>
                                 <input type="date" value={aiDeadline} onChange={e=>setAiDeadline(e.target.value)} className="w-full p-2 border rounded-lg"/>
                             </div>
                          )}

                          <textarea value={aiInstructions} onChange={e=>setAiInstructions(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="คำสั่งเพิ่มเติมให้ AI (เช่น เกี่ยวกับสัตว์, กิจวัตรประจำวัน)" rows={2}></textarea>
                      </div>

                      <div className="flex gap-2">
                          <button onClick={handleAiGenerate} disabled={isGeneratingAi} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2">
                              {isGeneratingAi ? <RefreshCw className="animate-spin" size={20}/> : <><Wand2 size={20}/> เริ่มสร้าง</>}
                          </button>
                          {(draftQuestions.length > 0 || draftRTItems.length > 0) && (
                              <button onClick={handleSaveDrafts} disabled={isProcessing} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2">
                                  <Save size={18}/> บันทึกทั้งหมด ({draftQuestions.length || draftRTItems.length})
                              </button>
                          )}
                      </div>

                      {(draftQuestions.length > 0 || draftRTItems.length > 0) && (
                          <div className="mt-6 space-y-2 max-h-40 overflow-y-auto border p-2 rounded-lg bg-gray-50">
                              {draftRTItems.map((item, i) => <div key={i} className="text-xs p-1 border-b last:border-0">{item.text}</div>)}
                              {draftQuestions.map((q, i) => <div key={i} className="text-xs p-1 border-b last:border-0">{q.text}</div>)}
                          </div>
                      )}
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
                         <div key={s.id} className="flex justify-between items-center border p-3 rounded-xl hover:bg-gray-50 transition-colors">
                             <div className="flex items-center gap-3">
                                 <div className="text-2xl w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 shadow-sm">{s.avatar}</div>
                                 <div>
                                     <div className="font-bold text-gray-800">{s.name}</div>
                                     <div className="text-xs font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 inline-block mt-0.5">
                                        รหัส: {s.id}
                                     </div>
                                 </div>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={()=>handleEditStudent(s)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Edit size={16}/></button>
                                 <button onClick={()=>openDeleteModal(s.id, 'STUDENT')} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         </div>
      )}
      
      {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
                  <h3 className="font-bold text-lg mb-2">{deleteModal.title}</h3>
                  <p className="text-gray-500 mb-6">{deleteModal.message}<br/><span className="text-red-500 font-bold">ยืนยันการลบ?</span></p>
                  <div className="flex gap-2">
                      <button onClick={()=>setDeleteModal({...deleteModal, isOpen:false})} className="flex-1 py-2 bg-gray-100 rounded-lg">ยกเลิก</button>
                      <button onClick={handleConfirmDelete} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold">ลบ</button>
                  </div>
              </div>
          </div>
      )}

      {createdStudent && (
        <div className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
           <div className="bg-white rounded-[32px] p-8 max-w-sm w-full relative overflow-hidden text-center shadow-2xl border-4 border-white transform scale-100 transition-transform">
               <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-b-[50%] -mt-16"></div>
               
               <div className="relative z-10 pt-4">
                   <div className="bg-white/20 inline-block px-4 py-1 rounded-full text-white text-sm font-bold mb-4 shadow-sm backdrop-blur-md">ลงทะเบียนสำเร็จ</div>
                   
                   <div className="w-28 h-28 bg-white rounded-full mx-auto mb-4 flex items-center justify-center text-7xl shadow-xl border-4 border-purple-50">
                       {createdStudent.avatar}
                   </div>
                   
                   <h2 className="text-2xl font-bold text-gray-800 mb-1">{createdStudent.name}</h2>
                   <p className="text-gray-500 text-sm mb-6">{createdStudent.school}</p>
                   
                   <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-4 mb-6 relative overflow-hidden">
                       <div className="absolute top-0 right-0 -mt-2 -mr-2 w-10 h-10 bg-purple-200 rounded-full opacity-50"></div>
                       <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">รหัสเข้าใช้งาน (ID)</p>
                       <div className="text-5xl font-black text-purple-600 font-mono tracking-widest drop-shadow-sm">{createdStudent.id}</div>
                       <p className="text-[10px] text-gray-400 mt-2">*จดรหัสนี้ไว้เพื่อเข้าสู่ระบบ</p>
                   </div>
                   
                   <button 
                    onClick={() => setCreatedStudent(null)} 
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
                   >
                       รับทราบ
                   </button>
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

      {/* STUDENT DETAIL MODAL */}
      {viewingStudentDetail && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                  <div className="bg-blue-600 p-6 text-white relative">
                      <button onClick={() => setViewingStudentDetail(null)} className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/30 transition"><X size={20}/></button>
                      <div className="flex flex-col items-center">
                          <div className="text-6xl bg-white p-2 rounded-full shadow-lg border-4 border-blue-200 mb-2">{viewingStudentDetail.avatar}</div>
                          <h3 className="text-2xl font-black">{viewingStudentDetail.name}</h3>
                          <span className="bg-blue-700 px-3 py-1 rounded-full text-sm font-bold border border-blue-500 mt-1">ID: {viewingStudentDetail.id}</span>
                      </div>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                      {/* Admin Feature: Login as Student */}
                      <button 
                        onClick={() => onAdminLoginAsStudent(viewingStudentDetail!)}
                        className="w-full mb-6 bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition shadow-md flex items-center justify-center gap-2"
                      >
                         <LogOut size={18} className="rotate-180" /> เข้าสู่ระบบในชื่อ {viewingStudentDetail.name.split(' ')[0]}
                      </button>

                      <h4 className="font-bold text-gray-500 text-sm uppercase tracking-wide mb-4 flex items-center gap-2"><BarChart2 size={16}/> คะแนนเฉลี่ยรายวิชา</h4>
                      
                      <div className="space-y-3">
                          {getStudentSubjectStats(viewingStudentDetail.id).length === 0 ? (
                              <div className="text-center text-gray-400 py-10">ยังไม่มีข้อมูลการสอบ</div>
                          ) : (
                              getStudentSubjectStats(viewingStudentDetail.id).map((stat, idx) => (
                                  <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                      <div className="font-bold text-gray-800">{stat.subject}</div>
                                      <div className="flex items-center gap-4">
                                          <div className="text-right">
                                              <div className="text-xs text-gray-400">สอบ {stat.count} ครั้ง</div>
                                              <div className="font-bold text-blue-600 text-lg">{stat.avg}%</div>
                                          </div>
                                          <div className="w-12 h-12 relative">
                                              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                  <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                  <path className={`${stat.avg >= 80 ? 'text-green-500' : stat.avg >= 50 ? 'text-yellow-500' : 'text-red-500'}`} strokeDasharray={`${stat.avg}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                              </svg>
                                          </div>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

const MenuCard = ({ icon, title, desc, color, onClick }: any) => (
  <button 
    onClick={onClick} 
    className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left flex flex-col gap-4 h-full group"
  >
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${color}`}>
        {icon}
    </div>
    <div>
        <h3 className="font-bold text-gray-800 text-lg mb-1">{title}</h3>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">{desc}</p>
    </div>
  </button>
);

export default TeacherDashboard;
