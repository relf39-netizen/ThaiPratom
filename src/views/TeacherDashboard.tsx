
import React, { useState, useEffect } from 'react';
import { Teacher, Student, Subject, Assignment, Question } from '../types';
import { UserPlus, BarChart2, FileText, LogOut, Save, RefreshCw, ExternalLink, Gamepad2, Calendar, Eye, CheckCircle, X, Clock, PlusCircle, ChevronLeft, ChevronRight, Book, Calculator, FlaskConical, Languages, ArrowLeft, Users, GraduationCap, Trash2, Edit, Shield, UserCog, KeyRound, Sparkles, Wand2, Key } from 'lucide-react';
import { getTeacherDashboard, manageStudent, addAssignment, addQuestion, manageTeacher, getAllTeachers, GOOGLE_SCRIPT_URL, deleteQuestion } from '../services/api';
import { generateQuestionWithAI } from '../services/aiService';

interface TeacherDashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onStartGame: () => void; 
}

const ADD_QUESTION_URL = GOOGLE_SCRIPT_URL;

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher, onLogout, onStartGame }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'students' | 'stats' | 'questions' | 'assignments' | 'teachers' | 'profile'>('menu');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Teacher Management State
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  // ✅ tForm includes ID
  const [tForm, setTForm] = useState<{ id: string, username: string, password: string, name: string, school: string, role: string, gradeLevel: string }>({ id: '', username: '', password: '', name: '', school: '', role: 'TEACHER', gradeLevel: 'ALL' });
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);

  // Profile Management State
  const [profileForm, setProfileForm] = useState({ name: teacher.name, password: teacher.password || '', confirmPassword: '' });

  // Student Form & Management State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAvatar, setNewStudentAvatar] = useState('👦');
  const [newStudentGrade, setNewStudentGrade] = useState('P6'); 
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // 🔥 Processing UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false); // For Add Button Loading

  // Assignment Form
  const [assignSubject, setAssignSubject] = useState<Subject>(Subject.MATH);
  const [assignCount, setAssignCount] = useState(10);
  const [assignDeadline, setAssignDeadline] = useState('');

  // Question Form
  const [qSubject, setQSubject] = useState<Subject>(Subject.MATH);
  const [qGrade, setQGrade] = useState('P6');
  const [qText, setQText] = useState('');
  const [qImage, setQImage] = useState('');
  const [qChoices, setQChoices] = useState({c1:'', c2:'', c3:'', c4:''});
  const [qCorrect, setQCorrect] = useState('1');
  const [qExplain, setQExplain] = useState('');

  // AI Generator State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState(''); // ✅ State for API Key
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Question Bank State
  const [qBankSubject, setQBankSubject] = useState<Subject | null>(null); 
  const [qBankPage, setQBankPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modal State
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // ✅ Check Admin Role (More Robust)
  const isAdmin = (teacher.role && teacher.role.toUpperCase() === 'ADMIN') || (teacher.username && teacher.username.toLowerCase() === 'admin');

  useEffect(() => {
    loadData();
    // ✅ Load saved API Key
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGeminiApiKey(savedKey);
  }, []);

  // Update profile form when teacher prop changes
  useEffect(() => {
      setProfileForm({ name: teacher.name, password: teacher.password || '', confirmPassword: teacher.password || '' });
  }, [teacher]);

  const loadData = async () => {
    setLoading(true);
    const data = await getTeacherDashboard(teacher.school);
    
    // ✅ CLIENT SIDE FILTER: Strict Mode for Students
    const myStudents = (data.students || []).filter((s: Student) => {
        // 1. กรองตามโรงเรียนก่อน (เสมอ)
        if (s.school !== teacher.school) return false;

        // 2. ถ้าเป็น Admin เห็นหมด
        if (isAdmin) return true;

        // 3. ถ้าเป็นครูทั่วไป ต้องมี teacherId ตรงกันเท่านั้น
        if (teacher.id && s.teacherId) {
            return String(s.teacherId) === String(teacher.id);
        }
        
        // 4. กรณีข้อมูลเก่า (ไม่มี teacherId) ให้แสดงด้วย ถ้าไม่ใช่ Admin 
        if (!s.teacherId) return true;

        return false; 
    });
    
    setStudents(myStudents);
    setStats(data.results || []);
    setAssignments(data.assignments || []); 
    setQuestions(data.questions || []); 
    setLoading(false);
  };

  // ✅ Helper Function: แปลงวันที่เป็นไทย
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // --- Helper: Verify Data Change (Polling Loop) ---
  const verifyDataChange = async (checkFn: (students: Student[]) => boolean) => {
      for (let i = 0; i < 5; i++) { 
          await new Promise(r => setTimeout(r, 1500)); 
          const data = await getTeacherDashboard(teacher.school);
          
          // ใช้ข้อมูลดิบทั้งหมดในการตรวจสอบ (ไม่กรอง ID) เพื่อให้มั่นใจว่าข้อมูลเข้า Sheet แล้วจริงๆ
          const allSchoolStudents = (data.students || []).filter((s: Student) => s.school === teacher.school);
          
          if (checkFn(allSchoolStudents)) {
              return allSchoolStudents; // Return list if found
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
              gradeLevel: teacher.gradeLevel || 'ALL'
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
      
      // ✅ Generate Unique ID for Teacher if not present
      let teacherIdToSave = String(tForm.id);
      if (!isEditingTeacher || !teacherIdToSave) {
          // ถ้าเพิ่มใหม่ ให้ใช้ timestamp เป็น ID
          teacherIdToSave = Date.now().toString();
      }

      const payload = {
          id: teacherIdToSave,
          username: tForm.username,
          password: tForm.password,
          name: tForm.name,
          school: tForm.school,
          role: tForm.role,
          gradeLevel: tForm.gradeLevel,
          action: action
      };

      try {
          const res = await manageTeacher(payload);
          if (res.success) {
              alert(isEditingTeacher ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มครูสำเร็จ (ID: ' + teacherIdToSave + ')');
              setTForm({ id: '', username: '', password: '', name: '', school: '', role: 'TEACHER', gradeLevel: 'ALL' });
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

  const handleDeleteTeacher = async (id: number | string) => {
      if (!confirm('ต้องการลบรายชื่อครูท่านนี้ใช่หรือไม่?')) return;
      setIsProcessing(true);
      setProcessingMessage('กำลังลบข้อมูลครู...');
      try {
          const res = await manageTeacher({ id: String(id), action: 'delete' });
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
  };

  const handleSaveStudent = async () => {
    if (!newStudentName) return alert("กรุณากรอกชื่อนักเรียน");

    // ✅ ตรวจสอบ ID ครู
    const currentTeacherId = teacher.id ? String(teacher.id) : '';

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
            return target !== undefined && target.name === newStudentName;
        });

        setIsProcessing(false);

        if (updatedStudents) {
            // Re-filter for current teacher
            const myStudents = updatedStudents.filter(s => isAdmin || !teacher.id || String(s.teacherId) === String(teacher.id) || !s.teacherId);
            setStudents(myStudents);
            alert('✅ แก้ไขข้อมูลสำเร็จ');
        } else {
            // Fallback Update UI
            setStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, name: newStudentName, avatar: newStudentAvatar, grade: newStudentGrade, teacherId: currentTeacherId } : s));
            alert('✅ บันทึกข้อมูลแล้ว (กำลังซิงค์ข้อมูลเบื้องหลัง)');
        }
        
        handleCancelEdit();
        return;
    }

    setIsSaving(true); 
    try {
        const res = await manageStudent({ 
            action: 'add', 
            name: newStudentName, 
            school: teacher.school, 
            avatar: newStudentAvatar, 
            grade: newStudentGrade,
            // ✅ ส่ง ID ครู เพื่อผูกข้อมูล
            teacherId: currentTeacherId
        });
        
        if (res.success && res.student) {
            setCreatedStudent(res.student);
            setStudents(prev => [...prev, res.student!]); 
            setNewStudentName('');
        } else {
            // ✅ Fallback verification: Relaxed logic
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
                alert('บันทึกไม่สำเร็จ: ' + (res.message || 'โปรดตรวจสอบการเชื่อมต่อ Google Script'));
            }
        }
    } catch(e) {
        const foundAdded = await verifyDataChange((list) => list.some(s => s.name === newStudentName));
        if (foundAdded) {
             const addedStudent = foundAdded.find(s => s.name === newStudentName);
             setCreatedStudent(addedStudent!);
             setStudents(prev => [...prev, { ...addedStudent!, teacherId: currentTeacherId }]);
             setNewStudentName('');
        } else {
             alert('เชื่อมต่อไม่สำเร็จ: ' + e);
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditStudent = (s: Student) => {
      setEditingStudentId(s.id);
      setNewStudentName(s.name);
      setNewStudentAvatar(s.avatar);
      setNewStudentGrade(s.grade || 'P6');
      const formElement = document.getElementById('student-form');
      if(formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteStudent = async (id: string) => {
      if (!confirm('ยืนยันการลบนักเรียนคนนี้ใช่หรือไม่?')) return;
      setIsProcessing(true);
      setProcessingMessage('กำลังลบข้อมูลออกจากฐานข้อมูล...');
      await manageStudent({ action: 'delete', id });
      setProcessingMessage('กำลังยืนยันการลบกับ Google Sheet...');
      const updatedStudents = await verifyDataChange((list) => {
          return !list.some(s => s.id === id);
      });
      setIsProcessing(false);
      if (updatedStudents) {
          const myStudents = updatedStudents.filter(s => isAdmin || !teacher.id || String(s.teacherId) === String(teacher.id) || !s.teacherId);
          setStudents(myStudents);
          alert('✅ ลบข้อมูลสำเร็จ');
      } else {
          setStudents(prev => prev.filter(s => s.id !== id));
          alert('✅ ลบข้อมูลเรียบร้อย (กำลังซิงค์ข้อมูลเบื้องหลัง)');
      }
  };

  const handleCancelEdit = () => {
      setEditingStudentId(null);
      setNewStudentName('');
      setNewStudentAvatar('👦');
  };

  const handleCreateAssignment = async () => {
    if (!assignDeadline) return alert('กรุณาเลือกวันกำหนดส่ง');
    setIsProcessing(true);
    setProcessingMessage('กำลังบันทึกการบ้าน...');
    const success = await addAssignment(teacher.school, assignSubject, assignCount, assignDeadline, teacher.name);
    if (success) { alert('✅ สั่งการบ้านเรียบร้อยแล้ว'); setAssignDeadline(''); await loadData(); } else { alert('เกิดข้อผิดพลาด'); }
    setIsProcessing(false);
  };
  
  const handleAddQuestion = async () => {
    if (!qText || !qChoices.c1 || !qChoices.c2) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    setIsProcessing(true);
    setProcessingMessage('กำลังบันทึกข้อสอบ...');
    
    // ✅ ส่ง teacherId ไปด้วย
    const success = await addQuestion({ 
        subject: qSubject, 
        grade: qGrade, 
        text: qText, 
        image: qImage, 
        c1: qChoices.c1, c2: qChoices.c2, c3: qChoices.c3, c4: qChoices.c4, 
        correct: qCorrect, 
        explanation: qExplain, 
        school: teacher.school,
        teacherId: teacher.id ? String(teacher.id) : ''
    });

    if (success) { alert('✅ บันทึกข้อสอบเรียบร้อยแล้ว'); setQText(''); setQChoices({c1:'', c2:'', c3:'', c4:''}); setQExplain(''); await loadData(); } else { alert('บันทึกไม่สำเร็จ'); }
    setIsProcessing(false);
  };

  const handleDeleteQuestion = async (id: string) => {
      if (!confirm('ยืนยันลบข้อสอบข้อนี้หรือไม่?')) return;
      setIsProcessing(true);
      setProcessingMessage('กำลังลบข้อสอบ...');
      const success = await deleteQuestion(id);
      if (success) {
          alert('✅ ลบข้อสอบสำเร็จ');
          await loadData();
      } else {
          alert('❌ ลบไม่สำเร็จ (โปรดตรวจสอบ Script)');
      }
      setIsProcessing(false);
  };

  const handleAiGenerate = async () => {
    if (!geminiApiKey) return alert("กรุณากรอก Gemini API Key ของท่าน");
    if (!aiTopic) return alert("กรุณาระบุเรื่องที่ต้องการออกข้อสอบ");
    
    // ✅ Save Key to LocalStorage
    localStorage.setItem('gemini_api_key', geminiApiKey);

    setIsGeneratingAi(true);
    try {
        const result = await generateQuestionWithAI(qSubject, qGrade, aiTopic, geminiApiKey);
        if (result) {
            setQText(result.text);
            setQChoices({
                c1: result.c1,
                c2: result.c2,
                c3: result.c3,
                c4: result.c4
            });
            setQCorrect(result.correct);
            setQExplain(result.explanation);
            
            setShowAiModal(false);
            setAiTopic('');
            alert("✨ สร้างโจทย์สำเร็จ! \n\nข้อมูลได้ถูกกรอกลงในแบบฟอร์มแล้ว \nท่านสามารถแก้ไข/ปรับปรุงโจทย์ได้ตามต้องการ ก่อนกด 'บันทึกข้อสอบ' ครับ");
        } else {
            alert("ไม่สามารถสร้างโจทย์ได้ในขณะนี้ กรุณาลองใหม่ หรือตรวจสอบ API Key");
        }
    } catch (e: any) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ AI: " + e.message);
    } finally {
        setIsGeneratingAi(false);
    }
  };
  
  const getStudentScore = (studentId: string) => { const studentResults = stats.filter(r => String(r.studentId) === String(studentId)); if (studentResults.length === 0) return null; return studentResults[studentResults.length - 1]; };
  const countSubmitted = (assignmentId: string) => { const submittedStudentIds = new Set(stats.filter(r => r.assignmentId === assignmentId).map(r => r.studentId)); return submittedStudentIds.size; };
  const GRADES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  
  const getFilteredQuestions = () => { 
      if (!qBankSubject) return []; 
      return questions.filter(q => { 
          if (q.subject !== qBankSubject) return false; 
          
          // ✅ Logic 1: CENTER/Admin questions are always visible
          const isCenter = q.school === 'CENTER' || q.school === 'Admin';
          
          // ✅ Logic 2: My Questions (Strict check for Teacher ID)
          // ต้องอยู่โรงเรียนเดียวกัน และ (เป็นเจ้าของเอง หรือ ข้อสอบเก่าไม่มีเจ้าของ)
          const isMine = q.school === teacher.school && (
              !q.teacherId || // Legacy: show if no owner specified
              String(q.teacherId) === String(teacher.id) // Strict: show if ID matches
          );
          
          if (!isCenter && !isMine) return false;

          // Logic 3: Grade Filtering
          if (!teacher.gradeLevel || teacher.gradeLevel === 'ALL') return true; 
          if (q.grade === 'ALL') return true; 
          return q.grade === teacher.gradeLevel; 
      }); 
  };
  
  const filteredQuestions = getFilteredQuestions();
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const currentQuestions = filteredQuestions.slice((qBankPage - 1) * ITEMS_PER_PAGE, qBankPage * ITEMS_PER_PAGE);

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

      {/* ✨ AI Generator Modal */}
      {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in overflow-hidden border-2 border-indigo-100">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles size={20} className="text-yellow-300" /> ให้ AI ช่วยออกข้อสอบ</h3>
                      <button onClick={() => setShowAiModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                      <p className="text-sm text-gray-500 mb-4">
                          ระบบจะสร้างโจทย์ 4 ตัวเลือกพร้อมเฉลยให้อัตโนมัติ โดยอ้างอิงจากวิชาและระดับชั้นที่คุณเลือกไว้
                      </p>
                      
                      {/* ✅ API Key Input */}
                      <div className="mb-4 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                          <label className="block text-xs font-bold text-indigo-700 mb-1 flex items-center gap-1">
                              <Key size={12}/> Your Gemini API Key
                              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="ml-auto text-indigo-500 hover:text-indigo-700 underline text-[10px]">รับ Key ที่นี่</a>
                          </label>
                          <input 
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white text-sm"
                            placeholder="วาง API Key ของคุณที่นี่..."
                          />
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl mb-4 text-sm flex gap-2">
                          <span className="font-bold text-gray-700">วิชา:</span> {qSubject}
                          <span className="text-gray-300">|</span>
                          <span className="font-bold text-gray-700">ชั้น:</span> {qGrade}
                      </div>

                      <div className="mb-6">
                          <label className="block text-sm font-bold text-gray-700 mb-2">ระบุเรื่องที่ต้องการ (Topic)</label>
                          <input 
                            type="text" 
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            className="w-full p-3 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition"
                            placeholder="เช่น เศษส่วน, พืชใบเลี้ยงคู่, คำราชาศัพท์..."
                          />
                      </div>

                      <button 
                        onClick={handleAiGenerate} 
                        disabled={isGeneratingAi || !aiTopic || !geminiApiKey}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      >
                          {isGeneratingAi ? (
                              <><RefreshCw size={18} className="animate-spin" /> กำลังคิดโจทย์...</>
                          ) : (
                              <><Wand2 size={18} /> สร้างโจทย์ทันที</>
                          )}
                      </button>
                      <p className="text-xs text-center text-gray-400 mt-2">
                          * ระบบจะบันทึก Key ไว้ในเครื่องของคุณเพื่อความสะดวกในครั้งต่อไป
                      </p>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-b-3xl md:rounded-3xl shadow-lg mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap size={28} /> ห้องพักครู</h2>
          <div className="opacity-90 text-sm mt-1 flex gap-2">
             <span>{teacher.school} • คุณครู{teacher.name}</span>
             {teacher.id && <span className="bg-black/20 px-2 rounded text-xs font-mono flex items-center gap-1"><Shield size={10}/> ID: {teacher.id}</span>}
             {isAdmin && <span className="text-yellow-300 font-bold">⭐(Admin)</span>}
          </div>
        </div>
        <button onClick={onLogout} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition backdrop-blur-sm"><LogOut size={20} /></button>
      </div>

      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-0">
            <MenuCard icon={<UserPlus size={40} />} title="จัดการนักเรียน" desc="ลงทะเบียนนักเรียนใหม่" color="bg-purple-50 text-purple-600 border-purple-200" onClick={() => setActiveTab('students')} />
            <MenuCard icon={<Calendar size={40} />} title="สั่งการบ้าน" desc="มอบหมายงานและติดตาม" color="bg-orange-50 text-orange-600 border-orange-200" onClick={() => setActiveTab('assignments')} />
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

            {/* 🔴 หน้า Admin (จัดการครู) */}
            {activeTab === 'teachers' && isAdmin && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Shield className="text-slate-600"/> จัดการข้อมูลครู</h3>
                        <button onClick={loadTeachers} className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg text-slate-600 flex items-center gap-1"><RefreshCw size={14}/> รีเฟรช</button>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* ... (Admin Form logic omitted for brevity, keeping existing) ... */}
                        <div className="md:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit shadow-sm">
                            <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">{isEditingTeacher ? '✏️ แก้ไขข้อมูล' : '➕ เพิ่มครูใหม่'}</h4>
                            <div className="space-y-3">
                                {isEditingTeacher && <div className="text-xs text-gray-400 font-mono">ID: {tForm.id}</div>}
                                <input type="text" placeholder="Username" value={tForm.username} onChange={e=>setTForm({...tForm, username:e.target.value})} className="w-full p-2 border rounded-lg bg-white"/>
                                <input type="text" placeholder="Password" value={tForm.password} onChange={e=>setTForm({...tForm, password:e.target.value})} className="w-full p-2 border rounded-lg bg-white"/>
                                <input type="text" placeholder="ชื่อ-นามสกุล" value={tForm.name} onChange={e=>setTForm({...tForm, name:e.target.value})} className="w-full p-2 border rounded-lg bg-white"/>
                                <input type="text" placeholder="โรงเรียน" value={tForm.school} onChange={e=>setTForm({...tForm, school:e.target.value})} className="w-full p-2 border rounded-lg bg-white"/>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={tForm.role} onChange={e=>setTForm({...tForm, role:e.target.value})} className="p-2 border rounded-lg bg-white">
                                        <option value="TEACHER">ครูทั่วไป</option>
                                        <option value="ADMIN">ผู้ดูแลระบบ</option>
                                    </select>
                                    <select value={tForm.gradeLevel} onChange={e=>setTForm({...tForm, gradeLevel:e.target.value})} className="p-2 border rounded-lg bg-white">
                                        <option value="ALL">ทุกชั้น</option>
                                        <option value="P1">ป.1</option><option value="P2">ป.2</option>
                                        <option value="P3">ป.3</option><option value="P4">ป.4</option>
                                        <option value="P5">ป.5</option><option value="P6">ป.6</option>
                                    </select>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {isEditingTeacher && <button onClick={()=>{setIsEditingTeacher(false); setTForm({ id: '', username: '', password: '', name: '', school: '', role: 'TEACHER', gradeLevel: 'ALL' });}} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">ยกเลิก</button>}
                                    <button onClick={handleSaveTeacher} disabled={isProcessing} className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-800">{isProcessing ? 'รอสักครู่...' : (isEditingTeacher ? 'บันทึกแก้ไข' : 'เพิ่มข้อมูล')}</button>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
                            {teacherLoading ? (
                                <div className="p-10 text-center text-gray-400 animate-pulse">กำลังโหลดรายชื่อ...</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-700 border-b">
                                        <tr><th className="p-3">ID</th><th className="p-3">ชื่อ</th><th className="p-3">User</th><th className="p-3">Pass</th><th className="p-3">โรงเรียน</th><th className="p-3">สิทธิ์</th><th className="p-3 text-right">จัดการ</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {allTeachers.length === 0 ? (
                                            <tr><td colSpan={7} className="p-6 text-center text-gray-400">ไม่พบข้อมูลครู</td></tr>
                                        ) : (
                                            allTeachers.map((t) => (
                                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 font-mono text-xs text-gray-400">{t.id}</td>
                                                    <td className="p-3 font-bold text-gray-800">{t.name}</td>
                                                    <td className="p-3 text-gray-500">{t.username}</td>
                                                    <td className="p-3 text-gray-400 font-mono">{t.password}</td>
                                                    <td className="p-3 text-gray-600">{t.school}</td>
                                                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${t.role==='ADMIN'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{t.role}</span></td>
                                                    <td className="p-3 flex justify-end gap-2">
                                                        <button onClick={()=>{setIsEditingTeacher(true); setTForm({ id: String(t.id) || '', username: t.username || '', password: t.password || '', name: t.name, school: t.school, role: t.role || 'TEACHER', gradeLevel: t.gradeLevel || 'ALL' });}} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded transition"><Edit size={16}/></button>
                                                        <button onClick={()=>handleDeleteTeacher(String(t.id))} className="text-red-500 hover:bg-red-100 p-1.5 rounded transition"><Trash2 size={16}/></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
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
                      {/* ... Student Form inputs ... */}
                      <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-600 mb-2">ระดับชั้น</label>
                          <select value={newStudentGrade} onChange={(e)=>setNewStudentGrade(e.target.value)} className="w-full p-3 border rounded-xl bg-white text-gray-900">
                              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                      </div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">ชื่อ-นามสกุล</label>
                      <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="w-full p-3 border rounded-xl mb-4 focus:ring-2 focus:ring-purple-200 outline-none text-gray-800 bg-white" placeholder="ด.ช. มานะ อดทน" />
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
                    
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-2"><h4 className="text-sm font-bold text-gray-500">รายชื่อนักเรียน ({students.length})</h4><button onClick={loadData} className="text-purple-600 hover:bg-purple-50 p-1 rounded"><RefreshCw size={14}/></button></div>
                      <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl bg-white">
                          {students.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">ยังไม่มีนักเรียนของคุณในระบบ</div> : students.map(s => (
                              <div key={s.id} className={`flex items-center p-3 border-b last:border-0 hover:bg-gray-50 gap-3 ${editingStudentId === s.id ? 'bg-orange-50' : ''}`}>
                                  <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-xl border border-purple-100">{s.avatar}</div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-gray-800 truncate">{s.name || 'ไม่ระบุชื่อ'}</p>
                                      <div className="flex gap-1">
                                         <span className="text-[10px] text-white bg-purple-400 px-2 py-0.5 rounded-full">{s.grade}</span>
                                         {/* Show Teacher ID */}
                                         {s.teacherId && <span className="text-[10px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded border">T: {String(s.teacherId).slice(-4)}</span>}
                                      </div>
                                  </div>
                                  <div className="flex-shrink-0 flex items-center gap-2">
                                      <span className="font-mono text-xs font-medium text-purple-600 bg-white px-2 py-1 rounded border border-purple-200 shadow-sm mr-2">{s.id}</span>
                                      
                                      <button onClick={() => handleEditStudent(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" title="แก้ไข">
                                          <Edit size={16}/>
                                      </button>
                                      <button onClick={() => handleDeleteStudent(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition" title="ลบ">
                                          <Trash2 size={16}/>
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                    </div>
                  </div>
                  {/* Student Card Preview */}
                  <div className="flex flex-col items-center justify-center mt-6 md:mt-0">
                    {createdStudent ? (
                      <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1 rounded-3xl shadow-2xl w-full max-w-xs animate-fade-in scale-100 transition-transform">
                        <div className="bg-white rounded-[22px] p-6 text-center relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-purple-500"></div>
                          <h4 className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-4">บัตรประจำตัวนักเรียน</h4>
                          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-6xl mx-auto mb-4 shadow-inner">{createdStudent.avatar}</div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{createdStudent.name}</h3>
                          <div className="flex justify-center gap-2 mb-6">
                              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold">{createdStudent.grade}</span>
                              <span className="text-gray-500 text-xs">{createdStudent.school}</span>
                          </div>
                          <div className="bg-gray-100 rounded-xl p-3 mb-2"><span className="block text-xs text-gray-400 mb-1">รหัสเข้าใช้งาน (ID)</span><span className="text-3xl font-mono font-black text-purple-600 tracking-widest">{createdStudent.id}</span></div>
                        </div>
                        <div className="text-center mt-4"><button onClick={() => setCreatedStudent(null)} className="text-white/90 text-sm font-bold underline hover:text-white">+ เพิ่มคนต่อไป</button></div>
                      </div>
                    ) : (<div className="text-center text-gray-400"><div className="bg-gray-100 w-32 h-48 rounded-xl mx-auto mb-4 border-2 border-dashed border-gray-300 flex items-center justify-center"><UserPlus size={40} className="opacity-20" /></div><p>กรอกชื่อด้านซ้ายเพื่อสร้างรหัส</p></div>)}
                  </div>
                </div>
            )}

            {activeTab === 'assignments' && (
              // Assignment Content (Kept same)
              <div className="max-w-4xl mx-auto">
                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="text-orange-500"/> สั่งงานใหม่</h4>
                    <div className="grid md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">วิชา</label>
                            <select value={assignSubject} onChange={(e) => setAssignSubject(e.target.value as Subject)} className="w-full p-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-orange-200 outline-none">
                                {Object.values(Subject).map((s) => <option key={s} value={s}>{s}</option>)}
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
                        <div className="flex items-end">
                            <button onClick={handleCreateAssignment} disabled={isProcessing} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold shadow hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 h-[42px]">
                                {isProcessing ? 'กำลังบันทึก...' : <><Save size={16}/> สั่งงาน</>}
                            </button>
                        </div>
                    </div>
                 </div>
    
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">รายการการบ้านที่สั่งแล้ว ({assignments.length})</h3>
                    <button onClick={loadData} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-gray-600 flex items-center gap-1"><RefreshCw size={14}/> รีเฟรช</button>
                 </div>
                 {assignments.length === 0 ? (
                     <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">ยังไม่มีการบ้าน</div>
                 ) : (
                     <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-orange-50 text-orange-900">
                                 <tr><th className="p-3">วิชา</th><th className="p-3 text-center">จำนวนข้อ</th><th className="p-3">กำหนดส่ง</th><th className="p-3 text-center">คนส่งแล้ว</th><th className="p-3 text-right">จัดการ</th></tr>
                             </thead>
                             <tbody>
                                 {assignments.slice().reverse().map((a) => {
                                     const submittedCount = countSubmitted(a.id);
                                     const isExpired = new Date(a.deadline) < new Date();
                                     return (
                                         <tr key={a.id} className="border-b hover:bg-gray-50 last:border-0">
                                             <td className="p-3 font-bold text-gray-900">{a.subject}</td>
                                             <td className="p-3 text-center text-gray-900">{a.questionCount}</td>
                                             <td className={`p-3 font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                                                 {formatDate(a.deadline)} {isExpired && '(หมดเขต)'}
                                             </td>
                                             <td className="p-3 text-center">
                                                 <span className={`px-2 py-1 rounded-full font-bold text-xs ${submittedCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                                     {submittedCount} คน
                                                 </span>
                                             </td>
                                             <td className="p-3 text-right">
                                                 <button onClick={() => setSelectedAssignment(a)} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto border border-blue-200">
                                                     <Eye size={14} /> ดูรายละเอียด
                                                 </button>
                                             </td>
                                         </tr>
                                     );
                                 })}
                             </tbody>
                         </table>
                     </div>
                 )}
              </div>
            )}

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
                        <tr><th className="p-4 rounded-tl-xl w-20 text-center">รูป</th><th className="p-4">ข้อมูลนักเรียน</th><th className="p-4 text-center">สถานะ</th><th className="p-4 rounded-tr-xl text-right">คะแนนล่าสุด</th></tr>
                      </thead>
                      <tbody>
                        {students.map(s => {
                          const score = getStudentScore(s.id);
                          return (
                            <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-3 text-center"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto">{s.avatar || '👤'}</div></td>
                              <td className="p-3 align-middle"><div className="font-bold text-gray-900 text-base mb-1">{s.name}</div><span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">ID: {s.id}</span></td>
                              <td className="p-3 text-center align-middle">{score ? <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 border border-green-200">สอบแล้ว</span> : <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">ยังไม่สอบ</span>}</td>
                              <td className="p-3 text-right align-middle">{score ? <div><span className="text-xl font-bold text-purple-700">{score.score}</span><span className="text-gray-500 text-sm">/{score.total}</span></div> : <span className="text-gray-300">-</span>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'questions' && (
               <div className="max-w-6xl mx-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-600" /> คลังข้อสอบ 
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          แสดงเฉพาะชั้น {teacher.gradeLevel || 'ทั้งหมด'}
                        </span>
                      </h3>
                      <div className="flex gap-2">
                         <a href={ADD_QUESTION_URL} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition">
                             <PlusCircle size={16} /> จัดการข้อสอบ (Admin)
                         </a>
                      </div>
                  </div>
                  {/* Form เพิ่มข้อสอบ */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">➕ เพิ่มข้อสอบใหม่ด่วน</h4>
                        
                        {/* ✨✨ AI BUTTON ✨✨ */}
                        <button 
                            onClick={() => setShowAiModal(true)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md hover:scale-105 transition flex items-center gap-2"
                        >
                            <Sparkles size={14} className="text-yellow-300"/> ให้ AI ช่วยออกข้อสอบ
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">วิชา</label>
                            <select value={qSubject} onChange={(e)=>setQSubject(e.target.value as Subject)} className="w-full p-2 border rounded-lg bg-white text-gray-900">
                                 {Object.values(Subject).map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">ระดับชั้น</label>
                            <select value={qGrade} onChange={(e)=>setQGrade(e.target.value)} className="w-full p-2 border rounded-lg bg-white text-gray-900">
                                 {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                            </select>
                         </div>
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
                      <button onClick={handleAddQuestion} disabled={isProcessing} className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold shadow hover:bg-blue-700 flex items-center justify-center gap-2">
                         {isProcessing ? 'กำลังบันทึก...' : <><PlusCircle size={20}/> บันทึกข้อสอบ</>}
                      </button>
                  </div>
    
                  {/* 1. ปุ่มเลือกวิชา (Filter) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                     {[
                        { id: Subject.MATH, icon: <Calculator />, color: 'bg-red-100 text-red-700 border-red-200' },
                        { id: Subject.THAI, icon: <Book />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                        { id: Subject.SCIENCE, icon: <FlaskConical />, color: 'bg-green-100 text-green-700 border-green-200' },
                        { id: Subject.ENGLISH, icon: <Languages />, color: 'bg-blue-100 text-blue-700 border-blue-200' }
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
                            <span className="font-bold">{sub.id}</span>
                        </button>
                     ))}
                  </div>
    
                  {/* 2. รายการข้อสอบ */}
                  {qBankSubject ? (
                      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                              <span className="font-bold text-gray-700">รายการข้อสอบวิชา {qBankSubject}</span>
                              <span className="text-xs text-gray-400">ทั้งหมด {filteredQuestions.length} ข้อ</span>
                          </div>
                          
                          {filteredQuestions.length === 0 ? (
                              <div className="p-10 text-center text-gray-400">ยังไม่มีข้อสอบในหมวดนี้</div>
                          ) : (
                              <div className="divide-y divide-gray-100">
                                  {currentQuestions.map((q, idx) => (
                                      <div key={q.id} className="p-5 hover:bg-blue-50 transition">
                                          <div className="flex justify-between items-start mb-3">
                                              <div className="flex gap-2">
                                                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">ข้อ {((qBankPage-1)*ITEMS_PER_PAGE) + idx + 1}</span>
                                                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">ชั้น {q.grade}</span>
                                                  <span className={`text-xs px-2 py-1 rounded font-bold ${q.school === 'CENTER' || q.school === 'Admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                      {q.school === 'CENTER' || q.school === 'Admin' ? 'ส่วนกลาง' : 'โรงเรียนเรา'}
                                                  </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs text-gray-300 font-mono">ID: {q.id}</span>
                                                  {/* ✅ ปุ่มลบ (แสดงเฉพาะข้อสอบที่โรงเรียนตัวเองสร้าง) */}
                                                  {q.school === teacher.school && (
                                                      <button 
                                                          onClick={() => handleDeleteQuestion(q.id)}
                                                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition"
                                                          title="ลบข้อสอบ"
                                                      >
                                                          <Trash2 size={16} />
                                                      </button>
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
                                  ))}
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
                          กรุณาเลือกวิชาเพื่อดูข้อสอบ
                      </div>
                  )}
               </div>
            )}
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

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold whitespace-nowrap transition flex-1 md:flex-none justify-center ${active ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100 bg-white border border-gray-100'}`}>{icon} {label}</button>
);

export default TeacherDashboard;
