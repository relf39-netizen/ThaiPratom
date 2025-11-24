
export interface Student {
  id: string;
  name: string;
  school?: string; 
  avatar: string; 
  stars: number; 
  grade?: string; 
}

export interface Teacher {
  id?: number;
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
  questionCount: number;
  deadline: string; 
  createdBy: string;
}

export type GameState = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'LEADERBOARD' | 'FINISHED';
