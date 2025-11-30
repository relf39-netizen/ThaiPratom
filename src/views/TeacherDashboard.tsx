
import React, { useState, useEffect } from 'react';
import { Teacher, Student, Subject, Assignment, Question } from '../types';
import { UserPlus, BarChart2, FileText, LogOut, Save, RefreshCw, Gamepad2, Calendar, Eye, CheckCircle, X, PlusCircle, ChevronLeft, ChevronRight, Puzzle, Music, Users, Trees, Link as LinkIcon, ArrowLeft, GraduationCap, Trash2, Edit, Shield, UserCog, KeyRound, Sparkles, Wand2, Key, HelpCircle, FolderOpen, Plus, FilePlus, Clock, ChevronRightCircle, AlertTriangle } from 'lucide-react';
import { getTeacherDashboard, manageStudent, addAssignment, addQuestion, editQuestion, manageTeacher, getAllTeachers, GOOGLE_SCRIPT_URL, deleteQuestion, deleteAssignment } from '../services/api';
import { generateQuestionWithAI, GeneratedQuestion } from '../services/aiService.ts';

interface TeacherDashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onStartGame: () => void; 
}

const ADD_QUESTION_URL = GOOGLE_SCRIPT_URL;

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

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher, onLogout, onStartGame }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'students' | 'stats' | 'questions' | 'assignments' | 'teachers' | 'profile'>('menu');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Teacher Management State
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [tForm, setTForm] = useState<{ id: string, username: string, password: string, name: string, school: string, role: string, gradeLevel: string }>({ id: '', username: '', password: '', name: '', school: '', role: 'TEACHER', gradeLevel: 'P2' });
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);

  // Profile Management State
  const [profileForm, setProfileForm] = useState({ name: teacher.name, password: teacher.password || '', confirmPassword: '' });

  // Student Form & Management State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAvatar, setNewStudentAvatar] = useState('👦');
  const [newStudentGrade, setNewStudentGrade] = useState('P2'); // Default grade
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  // Grade List Modal State
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [viewingGrade, setViewingGrade] = useState('');
  const [studentsInGrade, setStudentsInGrade] = useState<Student[]>([]);
  
  // 🔥 Processing UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Assignment Form (Manual) - kept for internal state but UI replaced by AI
  const [assignSubject, setAssignSubject] = useState<Subject>(Subject.SPELLING);
  const [assignCount, setAssignCount] = useState(10);
  const [assignDeadline, setAssignDeadline] = useState('');

  // Question Form
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null); 
  const [qSubject, setQSubject] = useState<Subject>(Subject.SPELLING);
  const [qText, setQText] = useState('');
  const [qImage, setQImage] = useState('');
  const [qChoices, setQChoices] = useState({c1:'', c2:'', c3:'', c4:''});
  const [qCorrect, setQCorrect] = useState('1');
  const [qExplain, setQExplain] = useState('');

  // AI Generator State
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAiHelp, setShowAiHelp] = useState(false); 
  const [aiTopic, setAiTopic] = useState('');
  const [aiInstructions, setAiInstructions] = useState(''); // New State for instructions
  const [aiGrade, setAiGrade] = useState('P2');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState<GeneratedQuestion[]>([]);
  
  // AI Assignment Options
  const [aiCreateAssignment, setAiCreateAssignment] = useState(false);
  const [aiDeadline, setAiDeadline] = useState('');

  // Question Bank State
  const [qBankSubject, setQBankSubject] = useState<Subject | null>(null); 
  const [qBankPage, setQBankPage] = useState(1);
  const [showMyQuestionsOnly, setShowMyQuestionsOnly] = useState(false); 
  const ITEMS_PER_PAGE = 5;

  // Modal State
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // 🔥 DELETE MODAL STATE
  const [deleteModal, setDeleteModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      targetId: string;
      type: 'STUDENT' | 'ASSIGNMENT' | 'QUESTION' | 'TEACHER';
  }>({
      isOpen: false,
      title: '',
      message: '',
      targetId: '',
      type: 'STUDENT'
  });

  const isAdmin = (teacher.role && teacher.role.toUpperCase() === 'ADMIN') || (teacher.username && teacher.username.toLowerCase() === 'admin');

  const normalizeId = (id: any) => {
      if (id === undefined || id === null) return '';
      return String(id).trim();
  };

  useEffect(() => {
    loadData();
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGeminiApiKey(savedKey);
  }, []);

  useEffect(() => {
      setProfileForm({ name: teacher.name, password: teacher.password || '', confirmPassword: teacher.password || '' });
  }, [teacher]);

  const loadData = async () => {
    setLoading(true);
    const data = await getTeacherDashboard(teacher.school);
    
    // Filter Students
    const myStudents = (data.students || []).filter((s: Student) => {
        if (s.school !== teacher.school) return false;
        if (isAdmin) return true;
        return true; 
    });
    
    setStudents(myStudents);
    setStats(data.results || []);
    setAssignments(data.assignments || []); 
    setQuestions(data.questions || []); 
    
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const verifyDataChange = async (checkFn: (students: Student[]) => boolean) => {
      for (let i = 0; i < 5; i++) { 
          await new Promise(r => setTimeout(r, 1500)); 
          const data = await getTeacherDashboard(teacher.school);
          const allSchoolStudents = (data.students || []).filter((s: Student) => s.school === teacher.school);
          if (checkFn(allSchoolStudents)) {
              return allSchoolStudents; 
          }
      }
      return null; 
  };

  const loadTeachers = async () => {
      if (!isAdmin) return;
      setTeacherLoading(true);
      try {
          const data = await getAllTeachers();
          if (Array.isArray(data)) {
              setAllTeachers(data);
          } else {
              setAllTeachers([]);
          }
      } catch (e) {
          console.error("Error loading teachers:", e);
          alert("โหลดข้อมูลครูไม่สำเร็จ");
      } finally {
          setTeacherLoading(false);
      }
  };

  const handleUpdateProfile = async () => {
      if (!profileForm.name || !profileForm.password) return alert('กรุณากรอกข้อมูลให้ครบ');
      if (profileForm.password !== profileForm.confirmPassword) return alert('รหัสผ่านยืนยันไม่ตรงกัน');

      setIsProcessing(true);
      setProcessingMessage('กำลังอัปเดตข้อมูลส่วนตัว...');

      try {
          const payload = {
              action: 'edit',
              id: teacher.id, 
              username: teacher.username,
              password: profileForm.password,
              name: profileForm.name,
              school: teacher.school,
              role: teacher.role || 'TEACHER',
              gradeLevel: 'P2' 
          };

          const res = await manageTeacher(payload);
          if (res.success) {
              alert('✅ อัปเดตข้อมูลสำเร็จ กรุณาเข้าสู่ระบบใหม่เพื่อให้ข้อมูลเป็นปัจจุบัน');
              onLogout(); 
          } else {
              alert('เกิดข้อผิดพลาด: ' + res.message);
          }
      } catch(e) {
          alert('เชื่อมต่อไม่สำเร็จ');
      }
      setIsProcessing(false);
  };

  const handleSaveTeacher = async () => {
      if (!tForm.username || !tForm.password || !tForm.name) return alert('กรุณากรอกข้อมูลให้ครบ');
      setIsProcessing(true);
      setProcessingMessage('กำลังบันทึกข้อมูลครู...');
      
      const action = isEditingTeacher ? 'edit' : 'add';
      let teacherIdToSave = String(tForm.id);
      if (!isEditingTeacher || !teacherIdToSave) {
          teacherIdToSave = Date.now().toString();
      }

      const payload = {
          id: teacherIdToSave,
          username: tForm.username,
          password: tForm.password,
          name: tForm.name,
          school: tForm.school,
          role: tForm.role,
          gradeLevel: 'P2', 
          action: action
      };

      try {
          const res = await manageTeacher(payload);
          if (res.success) {
              alert(isEditingTeacher ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มครูสำเร็จ');
              setTForm({ id: '', username: '', password: '', name: '', school: '', role: 'TEACHER', gradeLevel: 'P2' });
              setIsEditingTeacher(false);
              loadTeachers(); 
          } else {
              alert('เกิดข้อผิดพลาด: ' + res.message);
          }
      } catch(e) {
          alert('เชื่อมต่อไม่สำเร็จ');
      }
      setIsProcessing(false);
  };

  const openDeleteModal = (targetId: string, type: 'STUDENT' | 'ASSIGNMENT' | 'QUESTION' | 'TEACHER') => {
      let title = '';
      let message = '';
      
      switch (type) {
          case 'STUDENT': 
            title = 'ยืนยันลบนักเรียน'; 
            message = 'คุณต้องการลบข้อมูลนักเรียนคนนี้ใช่หรือไม่? ข้อมูลคะแนนจะหายไปด้วย'; 
            break;
          case 'ASSIGNMENT': 
            title = 'ยืนยันลบการบ้าน'; 
            message = 'คุณต้องการลบการบ้านนี้ใช่หรือไม่? ข้อมูลการส่งงานของนักเรียนในหัวข้อนี้จะถูกลบทั้งหมด'; 
            break;
          case 'QUESTION': 
            title = 'ยืนยันลบข้อสอบ'; 
            message = 'คุณต้องการลบข้อสอบข้อนี้ออกจากคลังข้อสอบใช่หรือไม่?'; 
            break;
          case 'TEACHER': 
            title = 'ยืนยันลบข้อมูลครู'; 
            message = 'คุณต้องการลบรายชื่อครูท่านนี้ใช่หรือไม่?'; 
            break;
      }

      setDeleteModal({
          isOpen: true,
          title,
          message,
          targetId,
          type
      });
  };

  const handleConfirmDelete = async () => {
      const { targetId, type } = deleteModal;
      setDeleteModal({ ...deleteModal, isOpen: false }); // Close modal

      if (type === 'TEACHER') {
          setIsProcessing(true);
          setProcessingMessage('กำลังลบข้อมูลครู...');
          try {
              const res = await manageTeacher({ id: targetId, action: 'delete' });
              if (res.success) {
                  alert('ลบสำเร็จ');
                  loadTeachers();
              } else {
                  alert('ลบไม่สำเร็จ');
              }
          } catch(e) {
              alert('เชื่อมต่อไม่สำเร็จ');
          }
          setIsProcessing(false);
      } 
      else if (type === 'STUDENT') {
          setIsProcessing(true);
          setProcessingMessage('กำลังลบข้อมูลออกจากฐานข้อมูล...');
          await manageStudent({ action: 'delete', id: targetId });
          setProcessingMessage('กำลังยืนยันการลบกับ Google Sheet...');
          const updatedStudents = await verifyDataChange((list) => {
              return !list.some(s => s.id === targetId);
          });
          setIsProcessing(false);
          
          const filterFunc = (prev: Student[]) => prev.filter(s => s.id !== targetId);
          
          if (updatedStudents) {
              const myStudents = updatedStudents.filter(s => s.school === teacher.school);
              setStudents(myStudents);
              setStudentsInGrade(filterFunc(studentsInGrade)); // Update modal list
              alert('✅ ลบข้อมูลสำเร็จ');
          } else {
              setStudents(filterFunc);
              setStudentsInGrade(filterFunc(studentsInGrade)); // Update modal list
              alert('✅ ลบข้อมูลเรียบร้อย (กำลังซิงค์ข้อมูลเบื้องหลัง)');
          }
      }
      else if (type === 'ASSIGNMENT') {
          setIsProcessing(true);
          setProcessingMessage('กำลังลบการบ้าน...');
          const success = await deleteAssignment(targetId);
          setIsProcessing(false); 

          if (success) {
              alert('✅ ลบการบ้านสำเร็จ');
              setAssignments(prev => prev.filter(a => a.id !== targetId)); 
              loadData(); 
          } else {
              alert('❌ ลบไม่สำเร็จ (อาจเป็นปัญหาที่ระบบ Google Script)');
          }
      }
      else if (type === 'QUESTION') {
          setIsProcessing(true);
          setProcessingMessage('กำลังลบข้อสอบ...');
          const success = await deleteQuestion(targetId);
          setIsProcessing(false); 
          
          if (success) {
              alert('✅ ลบข้อสอบสำเร็จ');
              setQuestions(prev => prev.filter(q => q.id !== targetId)); 
              loadData(); 
          } else {
              alert('❌ ลบไม่สำเร็จ');
          }
      }
  };

  const handleEditTeacher = (t: Teacher) => {
      setTForm({
          id: String(t.id),
          username: t.username || '',
          password: t.password || '',
          name: t.name,
          school: t.school,
          role: t.role || 'TEACHER',
          gradeLevel: 'P2'
      });
      setIsEditingTeacher(true);
  };

  const handleViewGradeStudents = (grade: string) => {
      const filtered = students.filter(s => (s.grade || 'P2') === grade);
      setViewingGrade(grade);
      setStudentsInGrade(filtered);
      setShowGradeModal(true);
  };

  const handleSaveStudent = async () => {
    if (!newStudentName) return alert("กรุณากรอกชื่อนักเรียน");
    const currentTeacherId = normalizeId(teacher.id);

    if (editingStudentId) {
        setIsProcessing(true);
        setProcessingMessage('กำลังบันทึกการแก้ไข...');
        
        await manageStudent({
            action: 'edit',
            id: editingStudentId,
            name: newStudentName,
            school: teacher.school,
            avatar: newStudentAvatar,
            grade: newStudentGrade,
            teacherId: currentTeacherId
        });

        setProcessingMessage('กำลังยืนยันข้อมูลกับ Google Sheet...');
        const updatedStudents = await verifyDataChange((list) => {
            const target = list.find(s => s.id === editingStudentId);
            return target !== undefined && target.name === newStudentName && target.grade === newStudentGrade;
        });

        setIsProcessing(false);

        if (updatedStudents) {
            const myStudents = updatedStudents.filter(s => s.school === teacher.school);
            setStudents(myStudents);
            alert('✅ แก้ไขข้อมูลสำเร็จ');
        } else {
            setStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, name: newStudentName, avatar: newStudentAvatar, grade: newStudentGrade, teacherId: currentTeacherId } : s));
            alert('✅ บันทึกข้อมูลแล้ว (กำลังซิงค์ข้อมูลเบื้องหลัง)');
        }
        
        handleCancelEdit();
        
        // Refresh modal if open
        if (showGradeModal && viewingGrade) {
            handleViewGradeStudents(viewingGrade);
        }
        return;
    }

    setIsSaving(true); 
    
    // ✅ Logic: Find max ID and increment
    let nextId = 10001;
    if (students.length > 0) {
        const ids = students.map(s => parseInt(s.id)).filter(n => !isNaN(n));
        if (ids.length > 0) {
            nextId = Math.max(...ids) + 1;
        }
    }
    const studentIdToSave = String(nextId);

    try {
        const res = await manageStudent({ 
            action: 'add', 
            id: studentIdToSave, // Send explicit ID
            name: newStudentName, 
            school: teacher.school, 
            avatar: newStudentAvatar, 
            grade: newStudentGrade, 
            teacherId: currentTeacherId
        });
        
        if (res.success && res.student) {
            setCreatedStudent(res.student);
            setStudents(prev => [...prev, res.student!]); 
            setNewStudentName('');
        } else {
            // Verification fallback
            const foundAdded = await verifyDataChange((list) => {
                return list.some(s => s.name === newStudentName);
            });

            if (foundAdded && foundAdded.length > 0) {
                const addedStudent = foundAdded.find(s => s.name === newStudentName);
                if (addedStudent) {
                    const fixedStudent = { ...addedStudent, teacherId: currentTeacherId };
                    setCreatedStudent(fixedStudent);
                    setStudents(prev => [...prev, fixedStudent]);
                    setNewStudentName('');
                } else {
                     alert('บันทึกไม่สำเร็จ: ' + (res.message || 'ไม่ทราบสาเหตุ'));
                }
            } else {
                // Optimistic UI Update
                const tempStudent: Student = { 
                    id: studentIdToSave, 
                    name: newStudentName, 
                    school: teacher.school, 
                    avatar: newStudentAvatar, 
                    grade: newStudentGrade, 
                    stars: 0 
                };
                setCreatedStudent(tempStudent);
                setStudents(prev => [...prev, tempStudent]);
                setNewStudentName('');
            }
        }
        
        // Refresh modal if open
        if (showGradeModal && viewingGrade) {
             const updatedList = [...students]; 
        }

    } catch(e) {
         alert('เชื่อมต่อไม่สำเร็จ: ' + e);
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditStudent = (s: Student) => {
      // Close modal first if open
      setShowGradeModal(false);
      
      setEditingStudentId(s.id);
      setNewStudentName(s.name);
      setNewStudentAvatar(s.avatar);
      setNewStudentGrade(s.grade || 'P2');
      const formElement = document.getElementById('student-form');
      if(formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingStudentId(null);
      setNewStudentName('');
      setNewStudentAvatar('👦');
      setNewStudentGrade('P2');
  };
  
  const handleEditQuestion = (q: Question) => {
      setEditingQuestionId(q.id);
      setQSubject(q.subject);
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
      
      document.getElementById('question-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelQuestionEdit = () => {
      setEditingQuestionId(null);
      setQText(''); 
      setQChoices({c1:'', c2:'', c3:'', c4:''}); 
      setQExplain('');
      setQImage('');
  };

  const handleSaveQuestion = async () => {
    if (!qText || !qChoices.c1 || !qChoices.c2) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    
    const tid = normalizeId(teacher.id);
    if (!tid) {
         if(!confirm('คำเตือน: ไม่พบรหัสประจำตัวครู (ID) ระบบอาจไม่บันทึกว่าเป็นข้อสอบของคุณ\nต้องการดำเนินการต่อหรือไม่?')) return;
    }

    setIsProcessing(true);
    setProcessingMessage(editingQuestionId ? 'กำลังบันทึกการแก้ไข...' : 'กำลังบันทึกข้อสอบ...');
    
    const questionPayload = { 
        id: editingQuestionId, 
        subject: qSubject, 
        grade: 'P2', 
        text: qText, 
        image: qImage, 
        c1: qChoices.c1, c2: qChoices.c2, c3: qChoices.c3, c4: qChoices.c4, 
        correct: qCorrect, 
        explanation: qExplain, 
        school: teacher.school,
        teacherId: tid
    };

    let success = false;
    if (editingQuestionId) {
        success = await editQuestion(questionPayload);
    } else {
        success = await addQuestion(questionPayload);
    }

    setIsProcessing(false);

    if (success) { 
        alert(editingQuestionId ? '✅ แก้ไขข้อสอบสำเร็จ' : '✅ บันทึกข้อสอบเรียบร้อยแล้ว'); 
        handleCancelQuestionEdit(); 
        await loadData(); 
    } else { 
        alert('บันทึกไม่สำเร็จ'); 
    }
  };

  const handleAiGenerate = async () => {
    if (!geminiApiKey) return alert("กรุณากรอก Gemini API Key ของท่าน");
    if (aiCreateAssignment && !aiTopic) return alert("กรุณาระบุหัวข้อแบบฝึกหัด (ชื่อการบ้าน)");
    localStorage.setItem('gemini_api_key', geminiApiKey);

    setIsGeneratingAi(true);
    try {
        // Generate 5 questions at a time
        const results = await generateQuestionWithAI(qSubject, aiGrade, aiInstructions, geminiApiKey, 5);
        
        if (results && results.length > 0) {
            setDraftQuestions(prev => [...prev, ...results]);
        } else {
            alert("ไม่สามารถสร้างโจทย์ได้ในขณะนี้ กรุณาลองใหม่ หรือตรวจสอบ API Key");
        }
    } catch (e: any) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ AI: " + e.message);
    } finally {
        setIsGeneratingAi(false);
    }
  };

  const handleRemoveDraftQuestion = (index: number) => {
      setDraftQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraftQuestions = async () => {
     if (draftQuestions.length === 0) return;
     if (aiCreateAssignment && !aiDeadline) return alert("กรุณาระบุวันกำหนดส่งการบ้าน");

     const tid = normalizeId(teacher.id);
     if (!tid) {
         if(!confirm('ไม่พบ ID ครู ระบบจะบันทึกโดยไม่มีเจ้าของ ยืนยัน?')) return;
     }

     setIsProcessing(true);
     let successCount = 0;
     const total = draftQuestions.length;

     // 1. Save Questions to Bank
     for (let i = 0; i < total; i++) {
        setProcessingMessage(`กำลังบันทึกข้อสอบข้อที่ ${i + 1}/${total}...`);
        const q = draftQuestions[i];
        
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

     // 2. Create Assignment (Optional)
     if (aiCreateAssignment && successCount > 0) {
         setProcessingMessage(`กำลังสร้างการบ้าน: ${aiTopic}...`);
         const assignSuccess = await addAssignment(
             teacher.school,
             aiTopic, // Use Title as subject
             aiGrade,
             successCount, // Use the count of generated questions
             aiDeadline,
             teacher.name
         );
         
         if (assignSuccess) {
             alert(`✅ บันทึกข้อสอบ ${successCount} ข้อ และสั่งการบ้านเรียบร้อยแล้ว!`);
         } else {
             alert(`✅ บันทึกข้อสอบ ${successCount} ข้อสำเร็จ แต่สร้างการบ้านไม่สำเร็จ`);
         }
     } else {
         alert(`✅ บันทึกข้อสอบ ${successCount}/${total} ข้อเรียบร้อยแล้ว!`);
     }

     setIsProcessing(false);
     
     // Clear State
     setDraftQuestions([]);
     setAiTopic('');
     setAiInstructions('');
     setShowAiModal(false);
     setAiCreateAssignment(false);
     setAiDeadline('');
     await loadData();
  };
  
  const countSubmitted = (assignmentId: string) => { const submittedStudentIds = new Set(stats.filter(r => r.assignmentId === assignmentId).map(r => r.studentId)); return submittedStudentIds.size; };
  
  const getFilteredQuestions = () => { 
      const currentTid = normalizeId(teacher.id);

      if (showMyQuestionsOnly) {
          if (!currentTid) return [];
          return questions.filter(q => normalizeId(q.teacherId) === currentTid);
      }

      if (!qBankSubject) return []; 
      return questions.filter(q => { 
          if (q.subject !== qBankSubject) return false; 
          const isCenter = q.school === 'CENTER' || q.school === 'Admin';
          const isMine = isAdmin || 
                         (currentTid && normalizeId(q.teacherId) === currentTid) || 
                         (!q.teacherId && q.school === teacher.school && q.school !== 'CENTER' && q.school !== 'Admin');
          
          if (isMine) return true;
          if (!isCenter && q.school !== teacher.school) return false;
          return true; 
      }); 
  };
  
  const filteredQuestions = getFilteredQuestions();
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const currentQuestions = filteredQuestions.slice((qBankPage - 1) * ITEMS_PER_PAGE, qBankPage * ITEMS_PER_PAGE);

  const openAiAssignmentModal = () => {
    setAiCreateAssignment(true);
    setShowAiModal(true);
    // Reset defaults for assignment creation
    setAiTopic('');
    setAiInstructions('');
    setDraftQuestions([]);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 relative">
      
      {/* 🔥 Loading Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 animate-fade-in border-4 border-purple-100">
                <div className="relative mb-6">
                    <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-purple-600">
                        <RefreshCw size={28} className="animate-pulse"/>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">{processingMessage}</h3>
                <p className="text-gray-500 text-center text-sm">ระบบกำลังทำงานร่วมกับ Google Sheet<br/>กรุณารอสักครู่...</p>
            </div>
        </div>
      )}

      {/* 🔥 Custom Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[24px] shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all border-4 border-white">
                <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Trash2 size={36} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{deleteModal.title}</h3>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                   {deleteModal.message}
                   <br/>
                   <span className="font-bold text-red-500 mt-2 block">Will you confirm the deletion?</span>
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} 
                        className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={handleConfirmDelete} 
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition"
                    >
                        ยืนยันลบ
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* 📚 Grade List Modal (Pop-up) */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden transform scale-100 transition-all border-4 border-white ring-4 ring-black/10">
                 <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 flex justify-between items-center shadow-md">
                     <h3 className="font-bold text-xl flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl"><Users size={24}/></div>
                        รายชื่อนักเรียนชั้น {GRADE_LABELS[viewingGrade] || viewingGrade} ({studentsInGrade.length} คน)
                     </h3>
                     <button onClick={() => setShowGradeModal(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition"><X size={20}/></button>
                 </div>
                 
                 <div className="p-6 max-h-[60vh] overflow-y-auto bg-gray-50/50">
                    {studentsInGrade.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {studentsInGrade.map(s => (
                                <div key={s.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:border-purple-200">
                                    <div className="text-3xl bg-purple-50 w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{s.avatar}</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800 text-lg">{s.name}</div>
                                        <div className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded w-fit">ID: {s.id}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEditStudent(s)} 
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition border border-transparent hover:border-blue-100 flex items-center gap-1 font-bold text-sm"
                                        >
                                            <Edit size={16}/> แก้ไข
                                        </button>
                                        <button 
                                            onClick={() => openDeleteModal(s.id, 'STUDENT')} 
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100 flex items-center gap-1 font-bold text-sm"
                                        >
                                            <Trash2 size={16}/> ลบ
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <FolderOpen size={48} className="mb-2 opacity-30"/>
                            <p>ยังไม่มีรายชื่อนักเรียนในชั้นนี้</p>
                        </div>
                    )}
                 </div>
                 
                 <div className="p-4 bg-white border-t border-gray-100 text-center flex justify-end">
                     <button onClick={() => setShowGradeModal(false)} className="bg-gray-100 text-gray-600 px-8 py-3 rounded-2xl font-bold hover:bg-gray-200 transition">ปิดหน้าต่าง</button>
                 </div>
             </div>
        </div>
      )}

      {/* ✨ AI Homework Builder Modal */}
      {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-fade-in overflow-hidden border-2 border-indigo-100 flex flex-col max-h-[90vh]">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Sparkles size={20} className="text-yellow-300" /> 
                        {aiCreateAssignment ? 'สร้างการบ้านด้วย AI (Form)' : 'สร้างแบบทดสอบเข้าคลังข้อสอบ'}
                      </h3>
                      <button onClick={() => setShowAiModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                      
                      {/* API Key Input */}
                      <div className="mb-4 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                          <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                 <Key size={12}/> Your Gemini API Key
                             </label>
                             <button onClick={() => setShowAiHelp(!showAiHelp)} className="text-[10px] text-indigo-500 hover:text-indigo-700 underline flex items-center gap-1">
                                 <HelpCircle size={10} /> วิธีขอ API Key
                             </button>
                          </div>

                          {showAiHelp && (
                              <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs text-gray-600 mb-2 shadow-sm animate-fade-in">
                                  <div className="font-bold mb-1 text-indigo-600">วิธีขอ API Key (ฟรี):</div>
                                  <ol className="list-decimal pl-4 space-y-1">
                                      <li>ไปที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-bold">aistudio.google.com/app/apikey</a></li>
                                      <li>ล็อกอินด้วย Google Account</li>
                                      <li>กด <b>Create API key</b></li>
                                      <li>เลือก <b>Create API key in new project</b></li>
                                      <li>กด <b>Copy</b> รหัสที่ขึ้นต้นด้วย <code>AIza...</code></li>
                                      <li>นำมาวางในช่องด้านล่างนี้</li>
                                  </ol>
                              </div>
                          )}

                          <input 
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white text-sm"
                            placeholder="วาง API Key ของคุณที่นี่..."
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">หมวดวิชา</label>
                             <select value={qSubject} onChange={(e) => setQSubject(e.target.value as Subject)} className="w-full p-3 border rounded-xl bg-white text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-200">
                                {Object.values(Subject).map((s) => <option key={s} value={s}>{s}</option>)}
                             </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">ระดับชั้น</label>
                              <select value={aiGrade} onChange={(e) => setAiGrade(e.target.value)} className="w-full p-3 border rounded-xl bg-white text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-200">
                                  {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                              </select>
                          </div>
                      </div>

                      {/* ✅ Topic Input - Only for Assignment (Homework Title) */}
                      {aiCreateAssignment && (
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">หัวข้อแบบฝึกหัด (ชื่อการบ้าน)</label>
                            <input 
                                type="text" 
                                value={aiTopic}
                                onChange={(e) => setAiTopic(e.target.value)}
                                className="w-full p-3 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition"
                                placeholder="เช่น การบ้านชุดที่ 1, ฝึกอ่านคำควบกล้ำ"
                            />
                        </div>
                      )}

                      {/* ✅ Instructions Input - For both modes */}
                      <div className="mb-4">
                          <label className="block text-sm font-bold text-gray-700 mb-2">คำสั่ง/คำอธิบายสำหรับ AI</label>
                          <textarea 
                              value={aiInstructions}
                              onChange={(e) => setAiInstructions(e.target.value)}
                              className="w-full p-3 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition"
                              placeholder="เช่น ขอโจทย์ยากๆ, เน้นคำที่มี รร, ไม่เอาคำศัพท์ยากเกินไป"
                              rows={2}
                          />
                      </div>

                      {/* ✅ Assignment Options (Visible only in assignment mode) */}
                      {aiCreateAssignment && (
                          <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200 animate-fade-in">
                              <h4 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2"><Calendar size={16}/> ตั้งค่าการส่งงาน</h4>
                              <div className="grid grid-cols-1 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-orange-600 mb-1">กำหนดส่งภายใน (Deadline)</label>
                                      <input 
                                        type="date" 
                                        value={aiDeadline}
                                        onChange={(e) => setAiDeadline(e.target.value)}
                                        className="w-full p-2 border border-orange-300 rounded-lg text-sm bg-white"
                                      />
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* Draft Questions List */}
                      {draftQuestions.length > 0 && (
                          <div className="mb-6">
                              <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center justify-between">
                                  <span>รายการข้อสอบที่จะสร้าง ({draftQuestions.length} ข้อ)</span>
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">พร้อมบันทึก</span>
                              </h4>
                              <div className="bg-gray-50 border border-gray-200 rounded-xl max-h-48 overflow-y-auto p-2 space-y-2">
                                  {draftQuestions.map((q, idx) => (
                                      <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex gap-3 group">
                                          <div className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">{idx + 1}</div>
                                          <div className="flex-1">
                                              <p className="text-sm font-bold text-gray-800 line-clamp-1">{q.text}</p>
                                              <p className="text-xs text-gray-400 mt-1">เฉลย: {q.correct} | {q.explanation}</p>
                                          </div>
                                          <button onClick={() => handleRemoveDraftQuestion(idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><X size={16}/></button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleAiGenerate} 
                            disabled={isGeneratingAi || !geminiApiKey}
                            className={`w-full py-3 rounded-xl font-bold shadow-sm border-2 transition-all flex items-center justify-center gap-2 ${draftQuestions.length > 0 ? 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isGeneratingAi ? (
                                <><RefreshCw size={18} className="animate-spin" /> กำลังสร้างโจทย์ 5 ข้อ...</>
                            ) : (
                                <><Plus size={18} /> {draftQuestions.length > 0 ? 'เพิ่มอีก 5 ข้อ' : 'เริ่มสร้าง 5 ข้อแรก'}</>
                            )}
                        </button>

                        {draftQuestions.length > 0 && (
                            <button 
                                onClick={handleSaveDraftQuestions}
                                disabled={isProcessing}
                                className="w-full bg-green-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-600 flex items-center justify-center gap-2 animate-pulse hover:animate-none"
                            >
                                <Save size={18} /> {aiCreateAssignment ? 'บันทึกและมอบหมายงานทันที' : 'บันทึกลงคลังข้อสอบ'} ({draftQuestions.length} ข้อ)
                            </button>
                        )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-b-3xl md:rounded-3xl shadow-lg mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap size={28} /> ห้องพักครู (ภาษาไทย)</h2>
          <div className="opacity-90 text-sm mt-1 flex gap-2">
             <span>{teacher.school} • คุณครู{teacher.name}</span>
             {teacher.id && <span className="bg-black/20 px-2 rounded text-xs font-mono flex items-center gap-1"><Shield size={10}/> ID: {teacher.id}</span>}
          </div>
        </div>
        <button onClick={onLogout} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition backdrop-blur-sm"><LogOut size={20} /></button>
      </div>

      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
            <MenuCard icon={<UserPlus size={40} />} title="จัดการนักเรียน" desc="ลงทะเบียนนักเรียน ป.1-6" color="bg-purple-50 text-purple-600 border-purple-200" onClick={() => setActiveTab('students')} />
            <MenuCard icon={<Calendar size={40} />} title="สั่งการบ้าน" desc="มอบหมายงานภาษาไทย" color="bg-orange-50 text-orange-600 border-orange-200" onClick={() => setActiveTab('assignments')} />
            <MenuCard icon={<BarChart2 size={40} />} title="ดูผลคะแนน" desc="สถิติการสอบ" color="bg-green-50 text-green-600 border-green-200" onClick={() => setActiveTab('stats')} />
            <MenuCard icon={<FileText size={40} />} title="คลังข้อสอบ" desc="เพิ่มและจัดการข้อสอบ" color="bg-blue-50 text-blue-600 border-blue-200" onClick={() => setActiveTab('questions')} />
            <MenuCard icon={<Gamepad2 size={40} />} title="จัดกิจกรรมเกม" desc="เปิดห้องแข่งขัน Real-time" color="bg-pink-50 text-pink-600 border-pink-200" onClick={onStartGame} />
            <MenuCard icon={<UserCog size={40} />} title="ข้อมูลส่วนตัว" desc="เปลี่ยนรหัสผ่าน / แก้ไขชื่อ" color="bg-teal-50 text-teal-600 border-teal-200" onClick={() => setActiveTab('profile')} />
            {isAdmin && (
                <MenuCard icon={<Shield size={40} />} title="จัดการระบบครู" desc="เพิ่ม/ลบ รายชื่อครู" color="bg-slate-50 text-slate-600 border-slate-200" onClick={() => { setActiveTab('teachers'); loadTeachers(); }} />
            )}
        </div>
      )}

      {activeTab !== 'menu' && (
        <div className="bg-white rounded-3xl shadow-sm p-4 md:p-6 min-h-[400px] relative animate-fade-in">
            <button onClick={() => setActiveTab('menu')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-purple-600 font-bold transition-colors"><div className="bg-gray-100 p-2 rounded-full"><ArrowLeft size={20} /></div> กลับเมนูหลัก</button>
            
            {activeTab === 'profile' && (
                <div className="max-w-xl mx-auto">
                    {/* (Profile UI) */}
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
                        <UserCog className="text-teal-600"/> จัดการข้อมูลส่วนตัว
                    </h3>
                    <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 shadow-sm">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Username (เปลี่ยนไม่ได้)</label>
                                <input type="text" value={teacher.username} disabled className="w-full p-3 border rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">ชื่อ-นามสกุล</label>
                                <input type="text" value={profileForm.name} onChange={e=>setProfileForm({...profileForm, name: e.target.value})} className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-teal-200 outline-none"/>
                            </div>
                            <div className="pt-4 border-t border-teal-100 mt-2">
                                <h4 className="text-sm font-bold text-teal-700 mb-3 flex items-center gap-2"><KeyRound size={16}/> เปลี่ยนรหัสผ่าน</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">รหัสผ่านใหม่</label>
                                        <input type="password" value={profileForm.password} onChange={e=>setProfileForm({...profileForm, password: e.target.value})} className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-teal-200 outline-none"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">ยืนยันรหัสผ่าน</label>
                                        <input type="password" value={profileForm.confirmPassword} onChange={e=>setProfileForm({...profileForm, confirmPassword: e.target.value})} className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-teal-200 outline-none"/>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleUpdateProfile} disabled={isProcessing} className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition mt-4">
                                {isProcessing ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'teachers' && isAdmin && (
                <div className="max-w-4xl mx-auto">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
                        <Shield className="text-slate-600"/> จัดการระบบครู (Admin Only)
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-1">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <h4 className="font-bold text-slate-800 mb-4">{isEditingTeacher ? 'แก้ไขข้อมูลครู' : 'เพิ่มครูใหม่'}</h4>
                                <div className="space-y-3">
                                    <input type="text" placeholder="Username" value={tForm.username} onChange={e=>setTForm({...tForm, username: e.target.value})} className="w-full p-3 border rounded-xl bg-white"/>
                                    <input type="text" placeholder="Password" value={tForm.password} onChange={e=>setTForm({...tForm, password: e.target.value})} className="w-full p-3 border rounded-xl bg-white"/>
                                    <input type="text" placeholder="ชื่อ-นามสกุล" value={tForm.name} onChange={e=>setTForm({...tForm, name: e.target.value})} className="w-full p-3 border rounded-xl bg-white"/>
                                    <input type="text" placeholder="โรงเรียน" value={tForm.school} onChange={e=>setTForm({...tForm, school: e.target.value})} className="w-full p-3 border rounded-xl bg-white"/>
                                    <select value={tForm.role} onChange={e=>setTForm({...tForm, role: e.target.value})} className="w-full p-3 border rounded-xl bg-white">
                                        <option value="TEACHER">TEACHER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                    <div className="flex gap-2 mt-4">
                                        {isEditingTeacher && <button onClick={()=>{setIsEditingTeacher(false); setTForm({ id: '', username: '', password: '', name: '', school: '', role: 'TEACHER', gradeLevel: 'P2' })}} className="px-3 py-2 bg-gray-200 rounded-lg text-sm font-bold">ยกเลิก</button>}
                                        <button onClick={handleSaveTeacher} disabled={isProcessing} className="flex-1 bg-slate-600 text-white py-2 rounded-lg font-bold hover:bg-slate-700">
                                            {isProcessing ? '...' : (isEditingTeacher ? 'บันทึกแก้ไข' : 'เพิ่มครู')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                             <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-500">รายชื่อครูทั้งหมด ({allTeachers.length})</h4>
                                <button onClick={loadTeachers} className="p-1 hover:bg-gray-100 rounded"><RefreshCw size={16}/></button>
                             </div>
                             {teacherLoading ? <div className="text-center py-10">Loading...</div> : (
                                 <div className="bg-white border rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                                     <table className="w-full text-sm text-left">
                                         <thead className="bg-slate-100 text-slate-700">
                                             <tr>
                                                 <th className="p-3">Username</th>
                                                 <th className="p-3">ชื่อ</th>
                                                 <th className="p-3">โรงเรียน</th>
                                                 <th className="p-3">Role</th>
                                                 <th className="p-3 text-right">Action</th>
                                             </tr>
                                         </thead>
                                         <tbody>
                                             {allTeachers.map(t => (
                                                 <tr key={t.id} className="border-b hover:bg-slate-50">
                                                     <td className="p-3 font-mono text-xs">{t.username}</td>
                                                     <td className="p-3 font-bold">{t.name}</td>
                                                     <td className="p-3">{t.school}</td>
                                                     <td className="p-3"><span className={`text-[10px] px-2 py-1 rounded font-bold ${t.role==='ADMIN'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-600'}`}>{t.role}</span></td>
                                                     <td className="p-3 text-right flex justify-end gap-2">
                                                         <button onClick={()=>handleEditTeacher(t)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit size={14}/></button>
                                                         <button onClick={()=>openDeleteModal(String(t.id), 'TEACHER')} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                                                     </td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div id="student-form">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        {editingStudentId ? <span className="text-orange-600 flex items-center gap-2">✏️ กำลังแก้ไขข้อมูลนักเรียน</span> : 'ลงทะเบียนนักเรียนใหม่'}
                    </h3>
                    <div className={`p-6 rounded-2xl border border-gray-200 transition-colors ${editingStudentId ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
                      <label className="block text-sm font-medium text-gray-600 mb-2">ชื่อ-นามสกุล</label>
                      <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="w-full p-3 border rounded-xl mb-4 focus:ring-2 focus:ring-purple-200 outline-none text-gray-800 bg-white" placeholder="ด.ช. มานะ อดทน" />
                      
                      <label className="block text-sm font-medium text-gray-600 mb-2">ระดับชั้น</label>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                            {GRADE_OPTIONS.map(g => (
                                <button
                                    key={g.value}
                                    onClick={() => setNewStudentGrade(g.value)}
                                    className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition ${newStudentGrade === g.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 bg-white text-gray-500 hover:border-purple-200'}`}
                                >
                                    {g.label}
                                </button>
                            ))}
                      </div>

                      <div className="bg-purple-50 p-3 rounded-xl mb-4 border border-purple-100"><span className="text-xs text-purple-600 font-bold uppercase">สังกัดโรงเรียน</span><p className="text-gray-800 font-medium truncate">{teacher.school}</p></div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">รูปแทนตัว</label>
                      <div className="flex gap-2 mb-6 overflow-x-auto py-1">{['👦','👧','🧒','🧑','👓','🦄','🦁','🐼'].map(emoji => (<button key={emoji} onClick={() => setNewStudentAvatar(emoji)} className={`text-2xl p-2 rounded-lg border-2 transition ${newStudentAvatar === emoji ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:bg-gray-200'}`}>{emoji}</button>))}</div>
                      
                      <div className="flex gap-2">
                          {editingStudentId && (
                              <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-600 px-4 py-3 rounded-xl font-bold">ยกเลิก</button>
                          )}
                          <button onClick={handleSaveStudent} disabled={isProcessing || isSaving || !newStudentName} className={`flex-1 text-white py-3 rounded-xl font-bold shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${editingStudentId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                              {isProcessing || isSaving ? 'กำลังดำเนินการ...' : (editingStudentId ? <><Save size={18} /> บันทึกแก้ไข</> : <><Save size={18} /> บันทึกข้อมูล</>)}
                          </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side: Grade Cards instead of long list */}
                  <div className="mt-6 md:mt-0">
                    <div className="flex justify-between items-center mb-4"><h4 className="text-sm font-bold text-gray-500">รายชื่อนักเรียน ({students.length})</h4><button onClick={loadData} className="text-purple-600 hover:bg-purple-50 p-1 rounded"><RefreshCw size={14}/></button></div>
                    
                    {/* ✅ New Grade Cards Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {GRADE_OPTIONS.map(g => {
                            const count = students.filter(s => (s.grade || 'P2') === g.value).length;
                            return (
                                <button 
                                    key={g.value} 
                                    onClick={() => handleViewGradeStudents(g.value)}
                                    className={`p-5 rounded-2xl border-2 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-2 ${g.color} bg-white`}
                                >
                                    <h3 className="text-3xl font-black">{g.label}</h3>
                                    <span className="text-sm font-bold opacity-80">{count} คน</span>
                                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-50 mt-1">คลิกดูรายชื่อ</div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Show created card below if just created */}
                    {createdStudent && (
                      <div className="mt-8 flex justify-center">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1 rounded-3xl shadow-2xl w-full max-w-xs animate-fade-in scale-100 transition-transform">
                            <div className="bg-white rounded-[22px] p-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-purple-500"></div>
                            <h4 className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-4">บัตรประจำตัวนักเรียน</h4>
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-6xl mx-auto mb-4 shadow-inner">{createdStudent.avatar}</div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">{createdStudent.name}</h3>
                            <div className="flex justify-center gap-2 mb-6">
                                <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold">{GRADE_LABELS[createdStudent.grade || 'P2']}</span>
                                <span className="text-gray-500 text-xs">{createdStudent.school}</span>
                            </div>
                            <div className="bg-gray-100 rounded-xl p-3 mb-2"><span className="block text-xs text-gray-400 mb-1">รหัสเข้าใช้งาน (ID)</span><span className="text-3xl font-mono font-black text-purple-600 tracking-widest">{createdStudent.id}</span></div>
                            </div>
                            <div className="text-center mt-4"><button onClick={() => setCreatedStudent(null)} className="text-white/90 text-sm font-bold underline hover:text-white">+ เพิ่มคนต่อไป</button></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            )}

            {activeTab === 'assignments' && (
              // Assignment Content
              <div className="max-w-4xl mx-auto">
                 {/* ✅ NEW: Create AI Assignment Button */}
                 <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-md text-white mb-8 flex justify-between items-center relative overflow-hidden">
                     <div className="relative z-10">
                         <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><Sparkles className="text-yellow-300" /> สร้างการบ้านด้วย AI</h2>
                         <p className="text-white/80 text-sm">ผู้ช่วยสร้างแบบทดสอบพร้อมเฉลย มอบหมายงานได้ทันที</p>
                         <button 
                            onClick={openAiAssignmentModal}
                            className="mt-4 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition transform hover:-translate-y-1 flex items-center gap-2"
                         >
                             <Wand2 size={20} /> เริ่มสร้างแบบฝึกหัด
                         </button>
                     </div>
                     <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
                         <FileText size={180} />
                     </div>
                 </div>

                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">การบ้านของนักเรียน ({assignments.length})</h3>
                    <button onClick={loadData} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-gray-600 flex items-center gap-1"><RefreshCw size={14}/> รีเฟรช</button>
                 </div>
                 
                 {assignments.length === 0 ? (
                     <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">ยังไม่มีการบ้าน</div>
                 ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {assignments.slice().reverse().map((a) => {
                             const submittedCount = countSubmitted(a.id);
                             const isExpired = new Date(a.deadline) < new Date();
                             const isOwner = isAdmin || (a.createdBy === teacher.name);
                             
                             return (
                                 <div 
                                    key={a.id} 
                                    onClick={() => setSelectedAssignment(a)}
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer relative group overflow-hidden"
                                 >
                                     <div className="absolute top-0 left-0 w-2 h-full bg-orange-400"></div>
                                     <div className="flex justify-between items-start mb-2 pl-3">
                                         <div>
                                            <h4 className="font-bold text-gray-800 text-lg line-clamp-1">{a.subject}</h4>
                                            <div className="text-xs text-gray-400 font-medium">
                                                {formatDate(a.deadline)} {isExpired && <span className="text-red-500">(หมดเขต)</span>}
                                            </div>
                                         </div>
                                         {isOwner && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openDeleteModal(a.id, 'ASSIGNMENT'); }}
                                                className="text-gray-300 hover:text-red-500 p-1"
                                                title="ลบ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                         )}
                                     </div>
                                     
                                     <div className="pl-3 mt-4 flex justify-between items-end">
                                         <div className="text-sm text-gray-500">
                                             <span className="font-bold text-orange-600 text-lg">{a.questionCount}</span> ข้อ
                                         </div>
                                         <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${submittedCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            <CheckCircle size={12}/> {submittedCount} คนส่ง
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 )}
              </div>
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
               <div className="max-w-6xl mx-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> คลังข้อสอบ 
                      </h3>
                      <div className="flex gap-2">
                         {/* ✅ Toggle Button for "My Questions" */}
                         <button
                            onClick={() => {
                                setShowMyQuestionsOnly(!showMyQuestionsOnly);
                                setQBankSubject(null); 
                                setQBankPage(1);
                            }}
                            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition ${showMyQuestionsOnly ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                         >
                             {showMyQuestionsOnly ? <CheckCircle size={16}/> : <UserCog size={16}/>}
                             แสดงข้อสอบของฉัน
                         </button>
                         <a href={ADD_QUESTION_URL} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition">
                             <PlusCircle size={16} /> จัดการข้อสอบ (Admin)
                         </a>
                      </div>
                  </div>
                  
                  {/* Form เพิ่ม/แก้ไขข้อสอบ */}
                  <div id="question-form" className={`bg-white p-6 rounded-2xl shadow-sm border mb-8 transition-colors ${editingQuestionId ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            {editingQuestionId ? <><Edit className="text-orange-500"/> แก้ไขข้อสอบ</> : <><PlusCircle className="text-blue-500"/> เพิ่มข้อสอบใหม่</>}
                        </h4>
                        
                        {/* ✨✨ AI BUTTON ✨✨ */}
                        {!editingQuestionId && (
                            <button 
                                onClick={() => {
                                    setAiCreateAssignment(false); 
                                    setShowAiModal(true);
                                    setAiInstructions('');
                                    setDraftQuestions([]);
                                }}
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md hover:scale-105 transition flex items-center gap-2"
                            >
                                <Sparkles size={14} className="text-yellow-300"/> สร้างโจทย์ด้วย AI
                            </button>
                        )}
                      </div>

                      <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1">เรื่อง</label>
                            <select value={qSubject} onChange={(e)=>setQSubject(e.target.value as Subject)} className="w-full p-2 border rounded-lg bg-white text-gray-900">
                                 {Object.values(Subject).map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                      </div>
                      
                      <div className="mb-4">
                         <label className="block text-xs font-bold text-gray-500 mb-1">โจทย์คำถาม</label>
                         <textarea value={qText} onChange={(e)=>setQText(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900" rows={2} placeholder="พิมพ์โจทย์..."></textarea>
                      </div>
                      <div className="mb-4">
                         <label className="block text-xs font-bold text-gray-500 mb-1">รูปภาพประกอบ (ถ้ามี Link)</label>
                         <input type="text" value={qImage} onChange={(e)=>setQImage(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900" placeholder="https://..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                         <input type="text" value={qChoices.c1} onChange={(e)=>setQChoices({...qChoices, c1:e.target.value})} placeholder="ก." className="p-2 border rounded-lg bg-white text-gray-900"/>
                         <input type="text" value={qChoices.c2} onChange={(e)=>setQChoices({...qChoices, c2:e.target.value})} placeholder="ข." className="p-2 border rounded-lg bg-white text-gray-900"/>
                         <input type="text" value={qChoices.c3} onChange={(e)=>setQChoices({...qChoices, c3:e.target.value})} placeholder="ค." className="p-2 border rounded-lg bg-white text-gray-900"/>
                         <input type="text" value={qChoices.c4} onChange={(e)=>setQChoices({...qChoices, c4:e.target.value})} placeholder="ง." className="p-2 border rounded-lg bg-white text-gray-900"/>
                      </div>
                      <div className="mb-4">
                         <label className="block text-xs font-bold text-gray-500 mb-1">เฉลยข้อถูก</label>
                         <select value={qCorrect} onChange={(e)=>setQCorrect(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900">
                            <option value="1">ก.</option><option value="2">ข.</option><option value="3">ค.</option><option value="4">ง.</option>
                         </select>
                      </div>
                      <div className="mb-4">
                         <label className="block text-xs font-bold text-gray-500 mb-1">อธิบายเฉลย</label>
                         <textarea value={qExplain} onChange={(e)=>setQExplain(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900" rows={1} placeholder="อธิบายเหตุผล..."></textarea>
                      </div>
                      
                      <div className="flex gap-2">
                          {editingQuestionId && (
                              <button onClick={handleCancelQuestionEdit} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300">ยกเลิก</button>
                          )}
                          <button onClick={handleSaveQuestion} disabled={isProcessing} className={`flex-1 py-2 rounded-xl font-bold shadow text-white flex items-center justify-center gap-2 ${editingQuestionId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                             {isProcessing ? 'กำลังบันทึก...' : (editingQuestionId ? <><Save size={20}/> บันทึกการแก้ไข</> : <><PlusCircle size={20}/> บันทึกข้อสอบ</>)}
                          </button>
                      </div>
                  </div>
    
                  {/* 1. ปุ่มเลือกวิชา (Filter) */}
                  {!showMyQuestionsOnly && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                         {[
                            { id: Subject.SPELLING, icon: <Puzzle />, color: 'bg-red-100 text-red-700 border-red-200' },
                            { id: Subject.TONES, icon: <Music />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                            { id: Subject.CLUSTERS, icon: <Users />, color: 'bg-green-100 text-green-700 border-green-200' },
                            { id: Subject.ROHAN, icon: <Trees />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
                            { id: Subject.RHYMES, icon: <LinkIcon />, color: 'bg-purple-100 text-purple-700 border-purple-200' }
                         ].map(sub => (
                            <button 
                                key={sub.id}
                                onClick={() => { setQBankSubject(sub.id); setQBankPage(1); }}
                                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                                    qBankSubject === sub.id 
                                    ? `${sub.color} ring-2 ring-offset-2 ring-gray-300 shadow-md scale-105` 
                                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="text-3xl">{sub.icon}</div>
                                <span className="font-bold text-xs">{sub.id}</span>
                            </button>
                         ))}
                      </div>
                  )}
    
                  {/* 2. รายการข้อสอบ */}
                  {(qBankSubject || showMyQuestionsOnly) ? (
                      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                          <div className={`p-4 border-b flex justify-between items-center ${showMyQuestionsOnly ? 'bg-purple-50' : 'bg-gray-50'}`}>
                              <span className={`font-bold ${showMyQuestionsOnly ? 'text-purple-900' : 'text-gray-700'}`}>
                                  {showMyQuestionsOnly ? 'รายการข้อสอบของคุณ (ทั้งหมด)' : `รายการข้อสอบ: ${qBankSubject}`}
                              </span>
                              <span className="text-xs text-gray-400">ทั้งหมด {filteredQuestions.length} ข้อ</span>
                          </div>
                          
                          {filteredQuestions.length === 0 ? (
                              <div className="p-10 text-center text-gray-400">ยังไม่มีข้อสอบในหมวดนี้</div>
                          ) : (
                              <div className="divide-y divide-gray-100">
                                  {currentQuestions.map((q, idx) => {
                                      // ✅ Check ownership more robustly
                                      const currentTid = normalizeId(teacher.id);
                                      const isMine = isAdmin || 
                                                     (currentTid && normalizeId(q.teacherId) === currentTid) || 
                                                     (!q.teacherId && q.school === teacher.school && q.school !== 'CENTER' && q.school !== 'Admin');

                                      return (
                                      <div key={q.id} className={`p-5 hover:bg-blue-50 transition ${isMine ? 'bg-purple-50/50' : ''} ${editingQuestionId === q.id ? 'ring-2 ring-orange-400 bg-orange-50' : ''}`}>
                                          <div className="flex justify-between items-start mb-3">
                                              <div className="flex gap-2">
                                                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">ข้อ {((qBankPage-1)*ITEMS_PER_PAGE) + idx + 1}</span>
                                                  <span className={`text-xs px-2 py-1 rounded font-bold ${q.school === 'CENTER' || q.school === 'Admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                      {q.school === 'CENTER' || q.school === 'Admin' ? 'ส่วนกลาง' : 'โรงเรียนเรา'}
                                                  </span>
                                                  {isMine && <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded font-bold">ของฉัน</span>}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-300 font-mono">ID: {q.id}</span>
                                                  
                                                  {/* ✅ ปุ่มแก้ไขและลบ (แสดงเฉพาะข้อสอบที่ฉันสร้าง หรือ Admin) */}
                                                  {isMine && (
                                                      <>
                                                          <button 
                                                              onClick={() => handleEditQuestion(q)}
                                                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 p-1.5 rounded transition"
                                                              title="แก้ไขข้อสอบ"
                                                          >
                                                              <Edit size={16} />
                                                          </button>
                                                          <button 
                                                              onClick={() => openDeleteModal(q.id, 'QUESTION')}
                                                              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition"
                                                              title="ลบข้อสอบ"
                                                          >
                                                              <Trash2 size={16} />
                                                          </button>
                                                      </>
                                                  )}
                                              </div>
                                          </div>
                                          <p className="font-bold text-gray-800 mb-3 text-lg">{q.text}</p>
                                          {q.image && <img src={q.image} alt="question" className="h-32 object-contain rounded border mb-3" />}
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                              {q.choices.map((c, cIdx) => (
                                                  <div key={c.id} className={`p-2 rounded border flex items-center gap-2 ${c.id === q.correctChoiceId ? 'bg-green-50 border-green-200 text-green-800 font-bold' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                      <span className="font-bold text-gray-400 w-5 text-center">{['ก','ข','ค','ง'][cIdx]}.</span>
                                                      {c.text} {c.id === q.correctChoiceId && '✅'}
                                                  </div>
                                              ))}
                                          </div>
                                          <div className="mt-3 text-xs text-gray-400">
                                              <span className="font-bold text-gray-500">เฉลย:</span> {q.explanation}
                                          </div>
                                      </div>
                                  )})}
                              </div>
                          )}
                          
                          {/* 3. Pagination */}
                          {totalPages > 1 && (
                              <div className="p-4 border-t bg-gray-50 flex justify-center gap-4 items-center">
                                  <button 
                                      onClick={() => setQBankPage(p => Math.max(1, p - 1))}
                                      disabled={qBankPage === 1}
                                      className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition"
                                  >
                                      <ChevronLeft />
                                  </button>
                                  <span className="font-bold text-gray-600">หน้า {qBankPage} / {totalPages}</span>
                                  <button 
                                      onClick={() => setQBankPage(p => Math.min(totalPages, p + 1))}
                                      disabled={qBankPage === totalPages}
                                      className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition"
                                  >
                                      <ChevronRight />
                                  </button>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-2xl">
                          <FileText size={48} className="mx-auto mb-2 opacity-20" />
                          กรุณาเลือกวิชา หรือกด "แสดงข้อสอบของฉัน"
                      </div>
                  )}
               </div>
            )}
        </div>
      )}

      {/* MODAL: View Progress (Modified Style) */}
      {selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in border-4 border-white">
                  <div className="p-5 border-b bg-orange-500 text-white flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-xl flex items-center gap-2"><Calendar size={24}/> {selectedAssignment.subject}</h3>
                        <p className="text-orange-100 text-sm mt-1">กำหนดส่ง: {formatDate(selectedAssignment.deadline)}</p>
                      </div>
                      <button onClick={() => setSelectedAssignment(null)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition"><X size={24}/></button>
                  </div>
                  
                  <div className="overflow-y-auto p-4 flex-1 bg-gray-50">
                      {students.length === 0 ? <div className="text-center py-10 text-gray-400">ไม่มีนักเรียนในโรงเรียนนี้</div> : (
                      <div className="grid grid-cols-1 gap-3">
                          {students.map(s => {
                              // หาผลสอบของการบ้านชิ้นนี้ (เอาล่าสุด)
                              const result = stats.filter(r => r.assignmentId === selectedAssignment.id && String(r.studentId) === String(s.id)).pop();
                              const isSubmitted = !!result;
                              
                              return (
                                  <div key={s.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                          <span className="text-3xl bg-gray-100 w-12 h-12 flex items-center justify-center rounded-full border-2 border-white shadow-sm">{s.avatar}</span>
                                          <div>
                                              <div className="font-bold text-gray-800">{s.name}</div>
                                              <div className="text-xs text-gray-400">ID: {s.id}</div>
                                          </div>
                                      </div>
                                      
                                      <div className="text-right">
                                          {isSubmitted ? (
                                              <div>
                                                  <div className="text-2xl font-black text-green-600 leading-none">
                                                      {result.score} <span className="text-sm text-gray-400 font-medium">/ {result.totalQuestions}</span>
                                                  </div>
                                                  <div className="text-[10px] text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full mt-1 inline-block">ส่งแล้ว</div>
                                              </div>
                                          ) : (
                                              <div className="flex flex-col items-end">
                                                  <div className="text-2xl font-black text-gray-300">-</div>
                                                  <div className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">ยังไม่ส่ง</div>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                      )}
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
