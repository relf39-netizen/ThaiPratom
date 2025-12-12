
export interface Student {
  id: string;
  name: string;
  school?: string; 
  avatar: string; 
  stars: number; 
  grade?: string; 
  teacherId?: string; 
  inventory?: string[]; // รายรายการไอเทมที่แลกแล้ว
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

// Define Subject constants for backward compatibility
export const Subject = {
  MATH: 'คณิตศาสตร์',
  THAI: 'ภาษาไทย',
  SCIENCE: 'วิทยาศาสตร์',
  ENGLISH: 'ภาษาอังกฤษ',
  SPELLING: 'การสะกดคำ',
  TONES: 'วรรณยุกต์',
  CLUSTERS: 'คำควบกล้ำ',
  ROHAN: 'ร หัน'
} as const;

// Allow Subject to be one of the constants OR any string (for custom subjects)
export type Subject = typeof Subject[keyof typeof Subject] | string;

export interface SubjectDef {
  id: string;
  name: string;
  grade: string; // P1, P2, ...
  color: string; // code for Tailwind class logic
  icon: string; // emoji or icon name
  school: string;
}

export interface Question {
  id: string;
  subject: string; 
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
  subject: string;
  score: number;
  totalQuestions: number;
  timestamp: number;
  assignmentId?: string; 
}

export interface Assignment {
  id: string;
  school: string;
  subject: string;
  grade?: string; 
  questionCount: number;
  deadline: string; 
  createdBy: string;
}

export type GameState = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'LEADERBOARD' | 'FINISHED';
