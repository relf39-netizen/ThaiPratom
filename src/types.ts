
export interface Student {
  id: string;
  name: string;
  school?: string; 
  avatar: string; 
  stars: number; 
  grade?: string; 
  teacherId?: string; // ✅ ระบุ ID ครูผู้ดูแล
}

export interface Teacher {
  id?: string | number; // ✅ รองรับทั้ง String และ Number สำหรับ ID
  username?: string;
  password?: string;
  name: string;
  school: string;
  role?: string; // ADMIN or TEACHER
  gradeLevel?: string; 
}

export enum Subject {
  MATH = 'คณิตศาสตร์',
  THAI = 'ภาษาไทย',
  SCIENCE = 'วิทยาศาสตร์',
  ENGLISH = 'ภาษาอังกฤษ'
}

export interface Question {
  id: string;
  subject: Subject;
  text: string;
  image?: string;
  choices: {
    id: string;
    text: string;
    image?: string;
  }[];
  correctChoiceId: string;
  explanation: string;
  grade?: string; 
  school?: string; 
  teacherId?: string; // ✅ เพิ่ม ID ครูเจ้าของข้อสอบ
}

export interface ExamResult {
  id: string;
  studentId: string;
  subject: Subject;
  score: number;
  totalQuestions: number;
  timestamp: number;
  assignmentId?: string; 
}

export interface Assignment {
  id: string;
  school: string;
  subject: Subject;
  grade?: string; // ✅ เพิ่มระดับชั้น
  questionCount: number;
  deadline: string; 
  createdBy: string;
}

export type GameState = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'LEADERBOARD' | 'FINISHED';
