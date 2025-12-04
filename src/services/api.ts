
// services/api.ts

import { Student, Question, Teacher, Subject, ExamResult, Assignment } from '../types'; 
import { db, firebase } from './firebaseConfig';
import { MOCK_STUDENTS, MOCK_QUESTIONS } from '../constants';

export interface AppData {
  students: Student[];
  questions: Question[];
  results: ExamResult[];
  assignments: Assignment[];
}

// 🔄 Helper: Convert Firebase Object to Array
const snapshotToArray = <T>(snapshot: firebase.database.DataSnapshot | null): T[] => {
  if (!snapshot || !snapshot.val()) return [];
  const val = snapshot.val();
  if (Array.isArray(val)) return val.filter(v => v); // Handle if it's stored as array
  return Object.keys(val).map(key => ({
    ...val[key],
    id: key // Ensure ID matches the key
  }));
};

// 🔄 Helper: Normalize Grade
const normalizeGrade = (raw: any): string => {
  const s = String(raw).trim();
  if (!s || s === 'undefined' || s === 'null') return 'P2'; 
  const upper = s.toUpperCase();
  if (upper === 'ALL') return 'ALL';
  if (upper.startsWith('TEACHER')) return 'TEACHER';
  if (upper.startsWith('ADMIN')) return 'ADMIN';
  const match = s.match(/\d+/);
  if (match) {
      return `P${match[0]}`; 
  }
  return 'P2'; 
};

// ---------------------------------------------------------------------------
// 🟢 TEACHER ACTIONS
// ---------------------------------------------------------------------------

// ✅ Teacher Login (Firebase)
export const teacherLogin = async (username: string, password: string): Promise<{success: boolean, teacher?: Teacher}> => {
  try {
    // 1. Try to find teacher by username
    const snapshot = await db.ref('teachers')
      .orderByChild('username')
      .equalTo(username)
      .once('value');

    const teachers = snapshotToArray<Teacher>(snapshot);
    const teacher = teachers.find(t => t.password === password);

    if (teacher) {
      return { success: true, teacher };
    }

    // 🟢 EMERGENCY RECOVERY:
    // ถ้าหา User "admin" ไม่เจอเลย (เพราะเผลอลบไป) และกรอกรหัส admin/admin
    // ให้สร้าง Admin ใหม่ทันที ไม่ว่าจะมีครูคนอื่นอยู่หรือไม่
    if (username === 'admin' && password === 'admin') {
        // เช็คอีกรอบว่าไม่มี admin จริงๆ ใช่ไหม (กันพลาด create ซ้ำถ้า password ผิด)
        const adminExists = teachers.some(t => t.username === 'admin');
        
        if (!adminExists) {
            const newTeacherRef = db.ref('teachers').push();
            const newTeacher: Teacher = {
                id: newTeacherRef.key as string,
                name: 'Admin Teacher',
                username: 'admin',
                password: 'admin',
                school: 'Admin School',
                role: 'ADMIN'
            };
            await newTeacherRef.set(newTeacher);
            return { success: true, teacher: newTeacher };
        }
    }

    return { success: false };
  } catch (e) {
    console.error("Login error", e);
    return { success: false };
  }
};

// ✅ Get All Teachers (Admin)
export const getTeachers = async (): Promise<Teacher[]> => {
  try {
    const snapshot = await db.ref('teachers').once('value');
    return snapshotToArray<Teacher>(snapshot);
  } catch (e) {
    console.error("Get teachers error", e);
    return [];
  }
};

// ✅ Manage Teacher (Add/Edit/Delete)
export const manageTeacher = async (data: { action: 'add' | 'edit' | 'delete', id?: string, name?: string, username?: string, password?: string, school?: string }): Promise<{success: boolean, message?: string}> => {
  try {
    if (data.action === 'delete' && data.id) {
        await db.ref(`teachers/${data.id}`).remove();
        return { success: true };
    }
    
    if (data.action === 'add') {
        const newRef = db.ref('teachers').push();
        await newRef.set({
            id: newRef.key,
            name: data.name,
            username: data.username,
            password: data.password,
            school: data.school,
            role: 'TEACHER'
        });
        return { success: true };
    }

    if (data.action === 'edit' && data.id) {
        await db.ref(`teachers/${data.id}`).update({
            name: data.name,
            username: data.username,
            password: data.password,
            school: data.school
        });
        return { success: true };
    }

    return { success: false, message: 'Invalid Action' };
  } catch (e) {
    return { success: false, message: 'Connection Error' };
  }
};

// ---------------------------------------------------------------------------
// 🟢 STUDENT ACTIONS
// ---------------------------------------------------------------------------

// ✅ Manage Student (Add/Edit/Delete)
export const manageStudent = async (data: { action: 'add' | 'edit' | 'delete', id?: string, name?: string, school?: string, avatar?: string, grade?: string, teacherId?: string }): Promise<{success: boolean, student?: Student, message?: string, rawError?: boolean}> => {
  try {
    if (data.action === 'delete' && data.id) {
        await db.ref(`students/${data.id}`).remove();
        // Also remove results? Optional.
        return { success: true };
    }

    if (data.action === 'edit' && data.id) {
        await db.ref(`students/${data.id}`).update({
            name: data.name,
            avatar: data.avatar,
            grade: normalizeGrade(data.grade),
            teacherId: data.teacherId || null
        });
        return { success: true };
    }

    if (data.action === 'add') {
        // Transaction to generate 5-digit ID (starts at 10001)
        const counterRef = db.ref('counters/studentId');
        const result = await counterRef.transaction((currentValue) => {
            return (currentValue || 10000) + 1;
        });

        const newId = String(result.snapshot.val());
        const newStudent: Student = {
            id: newId,
            name: data.name || 'Unknown',
            school: data.school || 'Unknown',
            avatar: data.avatar || '👦',
            stars: 0,
            grade: normalizeGrade(data.grade),
            teacherId: data.teacherId
        };

        // Use the ID as the key for easy lookup
        await db.ref(`students/${newId}`).set(newStudent);
        return { success: true, student: newStudent };
    }

    return { success: false };
  } catch (e) {
    console.error("Manage student error", e);
    return { success: false, message: 'Connection Error' };
  }
};

// ✅ Add Student Wrapper
export const addStudent = async (name: string, school: string, avatar: string, grade: string = 'P2', teacherId?: string): Promise<Student | null> => {
  const result = await manageStudent({ action: 'add', name, school, avatar, grade, teacherId });
  return result.student || null;
};

// ---------------------------------------------------------------------------
// 🟢 DASHBOARD DATA
// ---------------------------------------------------------------------------

// ✅ Get Teacher Dashboard Data (Fetch All and Filter)
export const getTeacherDashboard = async (school: string) => {
  try {
    const [studentsSnap, questionsSnap, resultsSnap, assignmentsSnap] = await Promise.all([
        db.ref('students').orderByChild('school').equalTo(school).once('value'), // Indexing recommended
        db.ref('questions').once('value'), // Get all questions to filter later (or use specific query)
        db.ref('results').once('value'),   // Get all results
        db.ref('assignments').orderByChild('school').equalTo(school).once('value')
    ]);

    const students = snapshotToArray<Student>(studentsSnap);
    
    // For questions, we want own school + CENTER + Admin
    let questions = snapshotToArray<Question>(questionsSnap);
    questions = questions.filter(q => q.school === school || q.school === 'CENTER' || q.school === 'Admin');

    const results = snapshotToArray<ExamResult>(resultsSnap);
    const assignments = snapshotToArray<Assignment>(assignmentsSnap);

    return { students, questions, results, assignments };
  } catch (e) {
    console.error(e);
    return { students: [], results: [], assignments: [], questions: [] };
  }
}

// ✅ Fetch Initial App Data (For Student App)
export const fetchAppData = async (): Promise<AppData> => {
  try {
    const [studentsSnap, questionsSnap, resultsSnap, assignmentsSnap] = await Promise.all([
        db.ref('students').once('value'),
        db.ref('questions').once('value'),
        db.ref('results').once('value'),
        db.ref('assignments').once('value')
    ]);

    let students = snapshotToArray<Student>(studentsSnap);
    if (students.length === 0) students = MOCK_STUDENTS; // Fallback for empty DB

    let questions = snapshotToArray<Question>(questionsSnap);
    if (questions.length === 0) questions = MOCK_QUESTIONS; // Fallback

    const results = snapshotToArray<ExamResult>(resultsSnap);
    const assignments = snapshotToArray<Assignment>(assignmentsSnap);

    return { students, questions, results, assignments };
  } catch (error) {
    console.error("Fetch error:", error);
    return { students: MOCK_STUDENTS, questions: MOCK_QUESTIONS, results: [], assignments: [] };
  }
};

// ---------------------------------------------------------------------------
// 🟢 QUESTION BANK
// ---------------------------------------------------------------------------

// ✅ Add Question
export const addQuestion = async (question: any): Promise<boolean> => {
  try {
    const newRef = db.ref('questions').push();
    await newRef.set({
      id: newRef.key,
      subject: question.subject,
      text: question.text,
      image: question.image || '',
      choices: [
          { id: '1', text: question.c1 },
          { id: '2', text: question.c2 },
          { id: '3', text: question.c3 },
          { id: '4', text: question.c4 },
      ],
      correctChoiceId: question.correct,
      explanation: question.explanation,
      grade: normalizeGrade(question.grade),
      school: question.school || '',
      teacherId: question.teacherId || ''
    });
    return true;
  } catch (e) {
    return false;
  }
};

// ✅ Edit Question
export const editQuestion = async (question: any): Promise<boolean> => {
  try {
    if (!question.id) return false;
    await db.ref(`questions/${question.id}`).update({
      subject: question.subject,
      text: question.text,
      image: question.image || '',
      choices: [
          { id: '1', text: question.c1 },
          { id: '2', text: question.c2 },
          { id: '3', text: question.c3 },
          { id: '4', text: question.c4 },
      ],
      correctChoiceId: question.correct,
      explanation: question.explanation,
      grade: normalizeGrade(question.grade)
    });
    return true;
  } catch (e) {
    return false;
  }
};

// ✅ Delete Question
export const deleteQuestion = async (id: string): Promise<boolean> => {
  try {
    await db.ref(`questions/${id}`).remove();
    return true;
  } catch (e) {
    return false;
  }
};

// ---------------------------------------------------------------------------
// 🟢 ASSIGNMENTS
// ---------------------------------------------------------------------------

// ✅ Add Assignment
export const addAssignment = async (school: string, subject: string, grade: string, questionCount: number, deadline: string, createdBy: string): Promise<boolean> => {
  try {
    const newRef = db.ref('assignments').push();
    await newRef.set({
        id: newRef.key,
        school,
        subject,
        grade: normalizeGrade(grade), 
        questionCount: Number(questionCount),
        deadline,
        createdBy
    });
    return true;
  } catch (e) {
    return false;
  }
};

// ✅ Delete Assignment
export const deleteAssignment = async (id: string): Promise<boolean> => {
  try {
    await db.ref(`assignments/${id}`).remove();
    return true;
  } catch (e) {
    return false;
  }
};

// ---------------------------------------------------------------------------
// 🟢 SCORES & RESULTS
// ---------------------------------------------------------------------------

// ✅ Save Score
export const saveScore = async (studentId: string, studentName: string, school: string, score: number, total: number, subject: string, assignmentId?: string) => {
  try {
    // 1. Save Result History
    const newResultRef = db.ref('results').push();
    await newResultRef.set({
        id: newResultRef.key,
        studentId,
        studentName,
        school,
        score,
        totalQuestions: total,
        subject,
        assignmentId: assignmentId || '-',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // 2. Update Student Stars
    const studentRef = db.ref(`students/${studentId}`);
    await studentRef.child('stars').transaction((currentStars) => {
        return (currentStars || 0) + score;
    });

    return true;
  } catch (e) {
    console.error("Save score error", e);
    return false;
  }
}
