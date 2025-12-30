
import { supabase } from './supabaseClient';
import { Student, Question, Teacher, Subject, ExamResult, Assignment, RTReadingItem } from '../types';
import { MOCK_STUDENTS, MOCK_QUESTIONS } from '../constants';

export interface AppData {
  students: Student[];
  questions: Question[];
  results: ExamResult[];
  assignments: Assignment[];
}

// Helper: แปลงชื่อวิชาให้เป็นมาตรฐาน
const normalizeSubject = (rawSubject: string): string => {
  if (!rawSubject) return Subject.THAI;
  const s = String(rawSubject).trim().toUpperCase();
  if (s === 'MATH' || s === 'คณิตศาสตร์' || s === 'คณิต') return Subject.MATH;
  if (s === 'THAI' || s === 'ภาษาไทย' || s === 'ไทย') return Subject.THAI;
  if (s === 'SCIENCE' || s === 'วิทยาศาสตร์' || s === 'วิทย์') return Subject.SCIENCE;
  if (s === 'ENGLISH' || s === 'ภาษาอังกฤษ' || s === 'อังกฤษ') return Subject.ENGLISH;
  if (s === 'RT_READING' || s === 'RT-การอ่านออกเสียง') return Subject.RT_READING;
  if (s === 'RT_COMPREHENSION' || s === 'RT-การอ่านรู้เรื่อง') return Subject.RT_COMPREHENSION;
  return rawSubject;
};

// --- RT (Reading Test) Actions ---
export const getRTReadingData = async (school: string, type?: 'WORD' | 'SENTENCE' | 'PASSAGE'): Promise<RTReadingItem[]> => {
    try {
        let query = supabase.from('rt_reading').select('*');
        if (school !== 'ทุกโรงเรียน' && school !== 'CENTER' && school !== 'Admin' && school !== 'Admin School') {
            query = query.or(`school.eq.${school},school.eq.CENTER`);
        }
        if (type) query = query.eq('type', type);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(item => ({ ...item, id: String(item.id) }));
    } catch (e) { 
        console.error("RT Fetch Error:", e);
        return []; 
    }
};

export const manageRTReading = async (action: 'add' | 'delete', item: any) => {
    try {
        if (action === 'add') {
            const { error } = await supabase.from('rt_reading').insert([{
                text: item.text,
                type: item.type,
                grade: item.grade || 'P1',
                school: item.school,
                teacher_id: String(item.teacher_id)
            }]);
            return !error;
        } else {
            const { error } = await supabase.from('rt_reading').delete().eq('id', item.id);
            return !error;
        }
    } catch (e) { return false; }
};

export const saveRTResult = async (studentId: string, itemId: string, score: number) => {
    try {
        await supabase.from('rt_results').insert([{
            student_id: studentId,
            item_id: itemId,
            score: score
        }]);
        const { data: student } = await supabase.from('students').select('stars').eq('id', studentId).single();
        if (student) {
            await supabase.from('students').update({ stars: (student.stars || 0) + score }).eq('id', studentId);
        }
        return true;
    } catch (e) { return false; }
};

// --- Teacher Actions ---
export const teacherLogin = async (username: string, password: string): Promise<{success: boolean, teacher?: Teacher}> => {
  if (username === 'admin' && password === 'admin') {
     return { success: true, teacher: { id: 'admin', name: 'ผู้ดูแลระบบ', username: 'admin', school: 'Admin', role: 'ADMIN' } };
  }
  try {
    const { data, error } = await supabase.from('teachers').select('*').eq('username', username).eq('password', password).single();
    if (error || !data) return { success: false };
    return { success: true, teacher: data };
  } catch (e) { return { success: false }; }
};

export const getTeachers = async (school?: string): Promise<Teacher[]> => {
  try {
    let query = supabase.from('teachers').select('*');
    if (school && school !== 'Admin') query = query.eq('school', school);
    const { data } = await query;
    return data || [];
  } catch (e) { return []; }
};

export const manageTeacher = async (data: any): Promise<boolean> => {
  try {
    if (data.action === 'add') {
      const { error } = await supabase.from('teachers').insert([{
        username: data.username, password: data.password, name: data.name, school: data.school, role: data.role || 'TEACHER'
      }]);
      return !error;
    } else if (data.action === 'edit' && data.id) {
        const { error } = await supabase.from('teachers').update({ name: data.name, username: data.username, password: data.password, school: data.school }).eq('id', data.id);
        return !error;
    } else if (data.action === 'delete') {
      const { error } = await supabase.from('teachers').delete().eq('id', data.id);
      return !error;
    }
    return false;
  } catch (e) { return false; }
};

// --- Student Actions ---
export const manageStudent = async (data: any): Promise<{ success: boolean; student?: Student; message?: string }> => {
  try {
    if (data.action === 'add') {
      const { data: last } = await supabase.from('students').select('id').order('id', { ascending: false }).limit(1);
      const newId = last && last.length > 0 ? String(parseInt(last[0].id) + 1) : '10001';
      const { data: student, error } = await supabase.from('students').insert([{
        id: newId, name: data.name, school: data.school, avatar: data.avatar, grade: data.grade, stars: 0, teacher_id: data.teacherId
      }]).select().single();
      if (error) throw error;
      return { success: true, student: { ...student, id: String(student.id) } };
    } else if (data.action === 'edit') {
      const { error } = await supabase.from('students').update({ name: data.name, avatar: data.avatar, grade: data.grade }).eq('id', data.id);
      return { success: !error };
    } else if (data.action === 'delete') {
        const { error } = await supabase.from('students').delete().eq('id', data.id);
        return { success: !error };
    }
    return { success: false };
  } catch (e: any) { return { success: false, message: e?.message }; }
};

export const redeemReward = async (studentId: string, itemCode: string, cost: number): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: student } = await supabase.from('students').select('stars, inventory').eq('id', studentId).single();
    if (!student || student.stars < cost) return { success: false, message: "ดาวไม่พอจ้ะ" };
    const inv = Array.isArray(student.inventory) ? student.inventory : [];
    if (inv.includes(itemCode)) return { success: false, message: "มีแล้วจ้ะ" };
    await supabase.from('students').update({ stars: student.stars - cost, inventory: [...inv, itemCode] }).eq('id', studentId);
    return { success: true, message: 'สำเร็จ!' };
  } catch (e) { return { success: false, message: 'ผิดพลาด' }; }
};

// --- Core Data & Dashboard ---
export const getTeacherDashboard = async (school: string) => {
  try {
    const isGlobal = school === 'ทุกโรงเรียน' || school === 'Admin' || school === 'CENTER';
    const studentsQ = isGlobal ? supabase.from('students').select('*') : supabase.from('students').select('*').eq('school', school);
    const resultsQ = isGlobal ? supabase.from('results').select('*') : supabase.from('results').select('*').eq('school', school);
    const assignmentsQ = isGlobal ? supabase.from('assignments').select('*') : supabase.from('assignments').select('*').eq('school', school);
    const questionsQ = supabase.from('questions').select('*').order('created_at', { ascending: false });

    const [sR, rR, aR, qR] = await Promise.all([studentsQ, resultsQ, assignmentsQ, questionsQ]);
    
    return { 
      students: (sR.data || []).map(s => ({ ...s, id: String(s.id), stars: Number(s.stars) || 0, grade: s.grade || 'P2' })), 
      results: (rR.data || []).map(r => ({ ...r, id: String(r.id), studentId: String(r.student_id), assignmentId: r.assignment_id, totalQuestions: r.total_questions, subject: normalizeSubject(r.subject) })), 
      assignments: (aR.data || []).map(a => ({ ...a, id: String(a.id), questionCount: a.question_count, grade: a.grade || 'ALL', subject: normalizeSubject(a.subject) })),
      questions: (qR.data || []).map(q => ({ ...q, id: String(q.id), correctChoiceId: String(q.correct_choice_id), grade: q.grade || 'P2', subject: normalizeSubject(q.subject) }))
    };
  } catch (e) { return { students: [], results: [], assignments: [], questions: [] }; }
};

export const fetchAppData = async (): Promise<AppData> => {
  try {
    const [s, q, r, a] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('questions').select('*'),
        supabase.from('results').select('*'),
        supabase.from('assignments').select('*')
    ]);
    return {
        students: (s.data || []).map(x => ({ ...x, id: String(x.id), stars: Number(x.stars) || 0 })),
        questions: (q.data || []).map(x => ({ ...x, id: String(x.id), correctChoiceId: String(x.correct_choice_id), subject: normalizeSubject(x.subject) })),
        results: (r.data || []).map(x => ({ ...x, id: String(x.id), studentId: String(x.student_id), subject: normalizeSubject(x.subject), totalQuestions: x.total_questions })),
        assignments: (a.data || []).map(x => ({ ...x, id: String(x.id), questionCount: x.question_count, subject: normalizeSubject(x.subject) }))
    };
  } catch (e) { return { students: MOCK_STUDENTS, questions: MOCK_QUESTIONS, results: [], assignments: [] }; }
};

// --- Question & Assignment Management ---
export const addQuestion = async (q: any) => {
  try {
    const choices = [{id:'1', text:q.c1}, {id:'2', text:q.c2}, {id:'3', text:q.c3}, {id:'4', text:q.c4}].filter(c => c.text);
    const { error } = await supabase.from('questions').insert([{
      subject: q.subject, text: q.text, image: q.image || '', choices, correct_choice_id: String(q.correct), 
      explanation: q.explanation || '', grade: q.grade || 'P1', school: q.school, teacher_id: String(q.teacherId || ''), rt_part: q.rt_part
    }]);
    return !error;
  } catch (e) { return false; }
};

export const editQuestion = async (id: string, q: any) => {
    try {
        const { error } = await supabase.from('questions').update({
            subject: q.subject, text: q.text, image: q.image || '', choices: [{id:'1', text:q.c1}, {id:'2', text:q.c2}, {id:'3', text:q.c3}, {id:'4', text:q.c4}].filter(c => c.text),
            correct_choice_id: String(q.correct), explanation: q.explanation || '', grade: q.grade || 'P2'
        }).eq('id', id);
        return !error;
    } catch (e) { return false; }
};

export const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    return !error;
};

export const addAssignment = async (school: string, subject: string, grade: string, questionCount: number, deadline: string, createdBy: string) => {
  try {
    const { error } = await supabase.from('assignments').insert([{
      school, subject, grade, question_count: Number(questionCount), deadline, created_by: createdBy
    }]);
    return !error;
  } catch (e) { return false; }
};

export const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    return !error;
};

export const saveScore = async (studentId: string, studentName: string, school: string, score: number, total: number, subject: string, assignmentId?: string) => {
  try {
    await supabase.from('results').insert([{
        student_id: String(studentId), student_name: studentName, school, subject: normalizeSubject(subject), 
        score, total_questions: total, assignment_id: assignmentId || '-'
    }]);
    const { data: student } = await supabase.from('students').select('stars').eq('id', studentId).single();
    if (student) {
        await supabase.from('students').update({ stars: (student.stars || 0) + score }).eq('id', studentId);
    }
    return true;
  } catch (e) { return false; }
};
