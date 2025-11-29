
export interface Student {
  id: string;
  name: string;
  school?: string; 
  avatar: string; 
  stars: number; 
  grade?: string; 
  teacherId?: string; 
}

export interface Teacher {
  id?: string | number; 
  username?: string;
  password?: string;
  name: string;
  school: string;
  role?: string; 
  gradeLevel?: string; 
}

// ✅ เปลี่ยนเป็นหัวข้อภาษาไทย ป.2
export enum Subject {
  SPELLING = 'มาตราตัวสะกด',
  TONES = 'การผันวรรณยุกต์',
  CLUSTERS = 'คำควบกล้ำ',
  ROHAN = 'คำที่มี รร',
  RHYMES = 'คำคล้องจอง'
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
  teacherId?: string; 
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
  grade?: string; 
  questionCount: number;
  deadline: string; 
  createdBy: string;
}

export type GameState = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'LEADERBOARD' | 'FINISHED';
