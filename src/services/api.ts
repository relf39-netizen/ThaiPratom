
// services/api.ts
import { supabase } from './supabaseClient';
import { Student, Question, Teacher, Subject, ExamResult, Assignment } from '../types';
import { MOCK_STUDENTS, MOCK_QUESTIONS } from '../constants';

export interface AppData {
  students: Student[];
  questions: Question[];
  results: ExamResult[];
  assignments: Assignment[];
}

// ---------------------------------------------------------------------------
// 🟢 TEACHER ACTIONS
// ---------------------------------------------------------------------------

export const teacherLogin = async (username: string, password: string): Promise<{success: boolean, teacher?: Teacher}> => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('username', username)
      .eq('password', password) // In production, use hashed passwords!
      .single();

    if (error || !data) {
      // Fallback for Admin emergency
      if (username === 'admin' && password === 'admin') {
         return { 
             success: true, 
             teacher: { id: 'admin', name: 'Admin', username: 'admin', school: 'Admin', role: 'ADMIN' } 
         };
      }
      return { success: false };
    }

    return { success: true, teacher: data };
  } catch (e) {
    console.error("Login error", e);
    return { success: false };
  }
};

export const getTeachers = async (): Promise<Teacher[]> => {
  const { data } = await supabase.from('teachers').select('*');
  return data || [];
};

export const manageTeacher = async (data: { action: 'add' | 'edit' | 'delete', id?: string, name?: string, username?: string, password?: string, school?: string }): Promise<{success: boolean, message?: string}> => {
  try {
    if (data.action === 'delete' && data.id) {
        await supabase.from('teachers').delete().eq('id', data.id);
        return { success: true };
    }
    
    if (data.action === 'add') {
        await supabase.from('teachers').insert([{
            name: data.name,
            username: data.username,
            password: data.password,
            school: data.school,
            role: 'TEACHER'
        }]);
        return { success: true };
    }

    if (data.action === 'edit' && data.id) {
        await supabase.from('teachers').update({
            name: data.name,
            username: data.username,
            password: data.password,
            school: data.school
        }).eq('id', data.id);
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

const generateStudentId = async (): Promise<string> => {
    // Logic: Find max ID and +1
    const { data } = await supabase.from('students').select('id').order('id', { ascending: false }).limit(1);
    if (data && data.length > 0) {
        const lastId = parseInt(data[0].id);
        if (!isNaN(lastId)) return String(lastId + 1);
    }
    return '10001';
};

export const manageStudent = async (data: { action: 'add' | 'edit' | 'delete', id?: string, name?: string, school?: string, avatar?: string, grade?: string, teacherId?: string }): Promise<{success: boolean, student?: Student, message?: string}> => {
  try {
    if (data.action === 'delete' && data.id) {
        await supabase.from('students').delete().eq('id', data.id);
        return { success: true };
    }

    if (data.action === 'edit' && data.id) {
        await supabase.from('students').update({
            name: data.name,
            avatar: data.avatar,
            grade: data.grade,
            teacher_id: data.teacherId
        }).eq('id', data.id);
        return { success: true };
    }

    if (data.action === 'add') {
        const newId = await generateStudentId();
        const newStudent = {
            id: newId,
            name: data.name,
            school: data.school,
            avatar: data.avatar || '👦',
            stars: 0,
            grade: data.grade || 'P2',
            teacher_id: data.teacherId,
            inventory: []
        };

        const { error } = await supabase.from('students').insert([newStudent]);
        if (error) throw error;

        // Convert DB snake_case to CamelCase for frontend
        return { success: true, student: { ...newStudent, teacherId: newStudent.teacher_id } };
    }

    return { success: false };
  } catch (e: any) {
    console.error("Manage student error", e);
    return { success: false, message: e.message };
  }
};

export const addStudent = async (name: string, school: string, avatar: string, grade: string = 'P2', teacherId?: string): Promise<Student | null> => {
  const result = await manageStudent({ action: 'add', name, school, avatar, grade, teacherId });
  return result.student || null;
};

export const redeemReward = async (studentId: string, itemCode: string, cost: number): Promise<{success: boolean, message: string}> => {
    try {
        // 1. Get current student data
        const { data: student, error } = await supabase.from('students').select('*').eq('id', studentId).single();
        
        if (error || !student) return { success: false, message: 'ไม่พบข้อมูลนักเรียน' };

        if (student.stars < cost) {
            return { success: false, message: 'ดาวสะสมไม่เพียงพอ' };
        }

        const currentInventory = student.inventory || [];
        // Check if itemCode is a string in JSON array
        if (currentInventory.includes(itemCode)) {
            return { success: false, message: 'มีไอเทมนี้แล้ว' };
        }

        // 2. Update
        const { error: updateError } = await supabase.from('students').update({
            stars: student.stars - cost,
            inventory: [...currentInventory, itemCode]
        }).eq('id', studentId);

        if (updateError) throw updateError;

        return { success: true, message: 'แลกของรางวัลสำเร็จ!' };
    } catch (e) {
        console.error(e);
        return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
    }
};

// ---------------------------------------------------------------------------
// 🟢 DATA FETCHING
// ---------------------------------------------------------------------------

export const getTeacherDashboard = async (school: string) => {
  try {
    const { data: students } = await supabase.from('students').select('*').eq('school', school);
    
    // Questions: Fetch School specific + CENTER + Admin
    const { data: questions } = await supabase.from('questions')
        .select('*')
        .or(`school.eq.${school},school.eq.CENTER,school.eq.Admin`);

    const { data: results } = await supabase.from('results').select('*').eq('school', school);
    const { data: assignments } = await supabase.from('assignments').select('*').eq('school', school);

    // Map snake_case to camelCase
    return {
        students: (students || []).map((s: any) => ({ ...s, teacherId: s.teacher_id })),
        questions: (questions || []).map((q: any) => ({ ...q, correctChoiceId: q.correct_choice_id, teacherId: q.teacher_id })),
        results: (results || []).map((r: any) => ({ ...r, studentId: r.student_id, totalQuestions: r.total_questions, assignmentId: r.assignment_id })),
        assignments: (assignments || []).map((a: any) => ({ ...a, questionCount: a.question_count, createdBy: a.created_by }))
    };
  } catch (e) {
    console.error(e);
    return { students: [], questions: [], results: [], assignments: [] };
  }
}

export const fetchAppData = async (): Promise<AppData> => {
  try {
    const { data: students } = await supabase.from('students').select('*');
    const { data: questions } = await supabase.from('questions').select('*');
    const { data: results } = await supabase.from('results').select('*');
    const { data: assignments } = await supabase.from('assignments').select('*');

    return {
        students: (students || []).map((s: any) => ({ ...s, teacherId: s.teacher_id })) || MOCK_STUDENTS,
        questions: (questions || []).map((q: any) => ({ ...q, correctChoiceId: q.correct_choice_id, teacherId: q.teacher_id })) || MOCK_QUESTIONS,
        results: (results || []).map((r: any) => ({ ...r, studentId: r.student_id, totalQuestions: r.total_questions, assignmentId: r.assignment_id })) || [],
        assignments: (assignments || []).map((a: any) => ({ ...a, questionCount: a.question_count, createdBy: a.created_by })) || []
    };
  } catch (error) {
    console.error("Fetch error:", error);
    return { students: MOCK_STUDENTS, questions: MOCK_QUESTIONS, results: [], assignments: [] };
  }
};

// ---------------------------------------------------------------------------
// 🟢 QUESTION BANK
// ---------------------------------------------------------------------------

export const addQuestion = async (question: any): Promise<boolean> => {
  try {
    const { error } = await supabase.from('questions').insert([{
      subject: question.subject,
      text: question.text,
      image: question.image || '',
      choices: [
          { id: '1', text: question.c1 },
          { id: '2', text: question.c2 },
          { id: '3', text: question.c3 },
          { id: '4', text: question.c4 },
      ],
      correct_choice_id: question.correct,
      explanation: question.explanation,
      grade: question.grade,
      school: question.school,
      teacher_id: question.teacherId
    }]);
    return !error;
  } catch (e) {
    return false;
  }
};

export const editQuestion = async (question: any): Promise<boolean> => {
  try {
    if (!question.id) return false;
    const { error } = await supabase.from('questions').update({
      subject: question.subject,
      text: question.text,
      image: question.image || '',
      choices: [
          { id: '1', text: question.c1 },
          { id: '2', text: question.c2 },
          { id: '3', text: question.c3 },
          { id: '4', text: question.c4 },
      ],
      correct_choice_id: question.correct,
      explanation: question.explanation,
      grade: question.grade
    }).eq('id', question.id);
    return !error;
  } catch (e) {
    return false;
  }
};

export const deleteQuestion = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
};

// ---------------------------------------------------------------------------
// 🟢 ASSIGNMENTS
// ---------------------------------------------------------------------------

export const addAssignment = async (school: string, subject: string, grade: string, questionCount: number, deadline: string, createdBy: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('assignments').insert([{
        school,
        subject,
        grade,
        question_count: Number(questionCount),
        deadline,
        created_by: createdBy
    }]);
    return !error;
  } catch (e) {
    return false;
  }
};

export const deleteAssignment = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
};

// ---------------------------------------------------------------------------
// 🟢 SCORES & RESULTS
// ---------------------------------------------------------------------------

export const saveScore = async (studentId: string, studentName: string, school: string, score: number, total: number, subject: string, assignmentId?: string) => {
  try {
    // 1. Insert Result
    await supabase.from('results').insert([{
        student_id: studentId,
        student_name: studentName,
        school,
        subject,
        score,
        total_questions: total,
        assignment_id: assignmentId || '-'
    }]);

    // 2. Update Student Stars (Get current first to be safe, or use RPC if advanced)
    const { data: student } = await supabase.from('students').select('stars').eq('id', studentId).single();
    if (student) {
        await supabase.from('students').update({
            stars: (student.stars || 0) + score
        }).eq('id', studentId);
    }

    return true;
  } catch (e) {
    console.error("Save score error", e);
    return false;
  }
}
