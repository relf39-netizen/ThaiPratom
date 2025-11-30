
// services/api.ts

import { Student, Question, Teacher, Subject, ExamResult, Assignment } from '../types'; 
import { MOCK_STUDENTS, MOCK_QUESTIONS } from '../constants';

// ---------------------------------------------------------------------------
// 🟢 Web App URL (Updated)
// ---------------------------------------------------------------------------
export const GOOGLE_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbx_ZjUutJLBsaayyPQLlV2UtwPFRiJaVjXaK5w2yMMt7sJ4e6TxS8HuXjUxRxI_WKtD/exec'; 

export interface AppData {
  students: Student[];
  questions: Question[];
  results: ExamResult[];
  assignments: Assignment[];
}

// 🔄 Helper: Add Timestamp to prevent caching
const getUrl = (params: string) => {
  const separator = params.includes('?') ? '&' : '?';
  return `${GOOGLE_SCRIPT_URL}${params}${separator}_t=${Date.now()}`;
};

// 🔄 Helper: Normalize Grade (e.g. "1", "ป.1", "Grade 1" -> "P1")
const normalizeGrade = (raw: any): string => {
  const s = String(raw).trim();
  if (!s || s === 'undefined' || s === 'null') return 'ALL'; 

  const upper = s.toUpperCase();
  if (upper === 'ALL') return 'ALL';
  if (upper.startsWith('TEACHER')) return 'TEACHER';
  if (upper.startsWith('ADMIN')) return 'ADMIN';

  // Extract first number found
  const match = s.match(/\d+/);
  if (match) {
      const num = parseInt(match[0], 10);
      return `P${num}`; // e.g. "1" -> "P1", "06" -> "P6"
  }

  // Fallback if no number found
  return 'P2'; 
};

// 🔄 Helper: Normalize Subject (Return exact string for custom subjects)
const normalizeSubject = (rawSubject: string): Subject => {
  const s = String(rawSubject).trim();
  if (!s) return 'ทั่วไป';
  return s; 
};

// 🔄 Helper: Convert Subject to Code (For sending to backend)
const convertToCode = (subjectEnum: Subject): string => {
    return String(subjectEnum);
};

// ✅ Teacher Login
export const teacherLogin = async (username: string, password: string): Promise<{success: boolean, teacher?: Teacher}> => {
  if (!GOOGLE_SCRIPT_URL) return { success: false };
  try {
    const response = await fetch(getUrl(`?type=teacher_login&username=${username}&password=${password}`));
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Login error", e);
    return { success: false };
  }
};

// ✅ Manage Student (Add/Edit/Delete)
export const manageStudent = async (data: { action: 'add' | 'edit' | 'delete', id?: string, name?: string, school?: string, avatar?: string, grade?: string, teacherId?: string }): Promise<{success: boolean, student?: Student, message?: string, rawError?: boolean}> => {
  if (!GOOGLE_SCRIPT_URL) return { success: false, message: 'No URL' };
  
  try {
    const params = new URLSearchParams();
    params.append('type', data.action === 'add' ? 'add_student' : 'manage_student');
    
    if (data.action) params.append('action', data.action);
    if (data.id) params.append('id', String(data.id));
    if (data.name) params.append('name', String(data.name));
    if (data.school) params.append('school', String(data.school));
    if (data.avatar) params.append('avatar', String(data.avatar));
    if (data.grade) params.append('grade', normalizeGrade(data.grade)); 
    if (data.teacherId) params.append('teacherId', String(data.teacherId));
    
    const response = await fetch(getUrl(`?${params.toString()}`));
    const text = await response.text();

    try {
        const result = JSON.parse(text);
        if (data.action === 'add' && result.success && !result.student && result.id) {
             return { 
                 success: true, 
                 student: { id: result.id, name: result.name, school: result.school, avatar: result.avatar, stars: 0, grade: normalizeGrade(result.grade), teacherId: result.teacherId } 
             };
        }
        return result;

    } catch (jsonError) {
        return { success: false, message: 'Server returned non-JSON response', rawError: true };
    }

  } catch (e) {
    return { success: false, message: 'Connection Error' };
  }
};

// ✅ Add New Student (Legacy Wrapper)
export const addStudent = async (name: string, school: string, avatar: string, grade: string = 'P2', teacherId?: string): Promise<Student | null> => {
  const result = await manageStudent({ action: 'add', name, school, avatar, grade: normalizeGrade(grade), teacherId });
  if (result.success && result.student) {
      return result.student;
  }
  if (result.success && (result as any).id) {
      return result as any;
  }
  return null;
};

// ✅ Get Teacher Dashboard Data
export const getTeacherDashboard = async (school: string) => {
  if (!GOOGLE_SCRIPT_URL) return { students: [], results: [], assignments: [], questions: [] };
  
  try {
    const response = await fetch(getUrl(`?type=teacher_data&school=${school}`));
    const data = await response.json();

    const cleanQuestions = (data.questions || []).map((q: any) => ({
      ...q,
      id: String(q.id).trim(),
      text: String(q.text || ''), 
      subject: normalizeSubject(q.subject), 
      choices: q.choices.map((c: any) => ({ 
          ...c, 
          id: String(c.id), 
          text: String(c.text || '') 
      })),
      correctChoiceId: String(q.correctChoiceId),
      grade: normalizeGrade(q.grade || 'ALL'),
      school: q.school || 'CENTER',
      teacherId: q.teacherId ? String(q.teacherId) : undefined
    }));
    
    const cleanStudents = (data.students || []).map((s: any) => ({
      ...s,
      id: String(s.id).trim(),
      grade: normalizeGrade(s.grade),
      teacherId: s.teacherId ? String(s.teacherId) : undefined
    }));

    const cleanAssignments = (data.assignments || []).map((a: any) => ({
      id: String(a.id),
      school: String(a.school),
      subject: normalizeSubject(a.subject),
      grade: normalizeGrade(a.grade || 'ALL'), 
      questionCount: Number(a.questionCount),
      deadline: String(a.deadline).split('T')[0],
      createdBy: String(a.createdBy)
    }));

    return { ...data, students: cleanStudents, questions: cleanQuestions, assignments: cleanAssignments };
  } catch (e) {
    return { students: [], results: [], assignments: [], questions: [] };
  }
}

// ✅ Add Question
export const addQuestion = async (question: any): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    const subjectCode = convertToCode(question.subject);
    const params = new URLSearchParams({
      type: 'add_question',
      subject: subjectCode, 
      text: question.text,
      image: question.image || '',
      c1: question.c1, c2: question.c2, c3: question.c3, c4: question.c4,
      correct: question.correct,
      explanation: question.explanation,
      grade: normalizeGrade(question.grade || 'P2'), // Normalize grade on save
      school: question.school || '',
      teacherId: question.teacherId || ''
    });

    await fetch(getUrl(`?${params.toString()}`));
    return true;
  } catch (e) {
    return false;
  }
};

// ✅ Edit Question
export const editQuestion = async (question: any): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    const subjectCode = convertToCode(question.subject);
    const params = new URLSearchParams({
      type: 'edit_question',
      id: question.id,
      subject: subjectCode,
      text: question.text,
      image: question.image || '',
      c1: question.c1, c2: question.c2, c3: question.c3, c4: question.c4,
      correct: question.correct,
      explanation: question.explanation,
      grade: normalizeGrade(question.grade || 'P2')
    });
    
    const response = await fetch(getUrl(`?${params.toString()}`));
    const result = await response.json();
    return result.success;
  } catch (e) {
    return false;
  }
};

// ✅ Delete Question
export const deleteQuestion = async (id: string): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    const response = await fetch(getUrl(`?type=delete_question&id=${encodeURIComponent(id)}`));
    try {
        const result = await response.json();
        return result.success !== false;
    } catch {
        return response.ok;
    }
  } catch (e) {
    return false;
  }
};

// ✅ Add Assignment
export const addAssignment = async (school: string, subject: string, grade: string, questionCount: number, deadline: string, createdBy: string): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    const params = new URLSearchParams({
        type: 'add_assignment',
        school,
        subject,
        grade: normalizeGrade(grade || 'P2'), 
        questionCount: String(questionCount),
        deadline,
        createdBy
    });
    await fetch(getUrl(`?${params.toString()}`));
    return true;
  } catch (e) {
    return false;
  }
};

// ✅ Delete Assignment
export const deleteAssignment = async (id: string): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    const response = await fetch(getUrl(`?type=delete_assignment&id=${encodeURIComponent(id)}`));
    const text = await response.text();
    try {
        const result = JSON.parse(text);
        return result.success !== false;
    } catch {
        return response.ok;
    }
  } catch (e) {
    console.error("Delete assignment error", e);
    return false;
  }
};

// ✅ Save Score
export const saveScore = async (studentId: string, studentName: string, school: string, score: number, total: number, subject: string, assignmentId?: string) => {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    const aidParam = assignmentId ? `&assignmentId=${encodeURIComponent(assignmentId)}` : '';
    const url = `?type=save_score&studentId=${studentId}&studentName=${encodeURIComponent(studentName)}&school=${encodeURIComponent(school)}&score=${score}&total=${total}&subject=${encodeURIComponent(subject)}${aidParam}`;
    await fetch(getUrl(url));
    return true;
  } catch (e) {
    return false;
  }
}

// ✅ Fetch Initial App Data
export const fetchAppData = async (): Promise<AppData> => {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === '') {
    return { students: MOCK_STUDENTS, questions: MOCK_QUESTIONS, results: [], assignments: [] };
  }
  try {
    const response = await fetch(getUrl(`?type=json`));
    const textData = await response.text();
    if (textData.trim().startsWith('<')) throw new Error('Invalid JSON response');
    const data = JSON.parse(textData);
    
    const cleanStudents = (data.students || []).map((s: any) => ({
      ...s, id: String(s.id).trim(), stars: Number(s.stars) || 0, grade: normalizeGrade(s.grade),
      teacherId: s.teacherId ? String(s.teacherId) : undefined
    }));
    
    // Updated: Ensure question has a school property even if missing in JSON
    const cleanQuestions = (data.questions || []).map((q: any) => ({
      ...q, 
      id: String(q.id).trim(), 
      text: String(q.text || ''), 
      subject: normalizeSubject(q.subject), 
      choices: q.choices.map((c: any) => ({ 
          ...c, 
          id: String(c.id),
          text: String(c.text || '') 
      })),
      correctChoiceId: String(q.correctChoiceId),
      grade: normalizeGrade(q.grade || 'ALL'), // Force normalize grade
      school: q.school || 'CENTER', 
      teacherId: q.teacherId ? String(q.teacherId) : undefined
    }));

    const cleanResults = (data.results || []).map((r: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      studentId: String(r.studentId),
      subject: normalizeSubject(r.subject),
      score: Number(r.score),
      totalQuestions: Number(r.total),
      timestamp: new Date(r.timestamp).getTime(),
      assignmentId: r.assignmentId !== '-' ? r.assignmentId : undefined
    }));
    
    const cleanAssignments = (data.assignments || []).map((a: any) => ({
      id: String(a.id), 
      school: String(a.school), 
      subject: normalizeSubject(a.subject),
      grade: normalizeGrade(a.grade || 'ALL'), 
      questionCount: Number(a.questionCount), 
      deadline: String(a.deadline).split('T')[0], 
      createdBy: String(a.createdBy)
    }));

    return { students: cleanStudents, questions: cleanQuestions, results: cleanResults, assignments: cleanAssignments };
  } catch (error) {
    return { students: MOCK_STUDENTS, questions: MOCK_QUESTIONS, results: [], assignments: [] };
  }
};
