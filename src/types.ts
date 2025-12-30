
export interface Student {
  id: string;
  name: string;
  school?: string; 
  avatar: string; 
  stars: number;
  grade?: string; 
  inventory?: string[]; 
}

export interface Teacher {
  id?: string | number; 
  username?: string;
  password?: string;
  name: string;
  school: string;
  role?: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'ADMIN' | 'admin'; 
}

export enum Subject {
  MATH = 'คณิตศาสตร์',
  THAI = 'ภาษาไทย',
  SCIENCE = 'วิทยาศาสตร์',
  ENGLISH = 'ภาษาอังกฤษ',
  RT_READING = 'RT-การอ่านออกเสียง',
  RT_COMPREHENSION = 'RT-การอ่านรู้เรื่อง',
  SPELLING = 'การสะกดคำ',
  TONES = 'วรรณยุกต์',
  CLUSTERS = 'คำควบกล้ำ',
  ROHAN = 'ร หัน'
}

export interface SubjectDef {
  id?: string;
  name: string;
  school: string;
  grade: string; 
  icon: string;
  color: string;
}

export interface Question {
  id: string;
  subject: Subject | string;
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
  rt_part?: 'MATCHING' | 'SENTENCE' | 'PASSAGE';
}

export interface RTReadingItem {
  id: string;
  text: string;
  type: 'WORD' | 'SENTENCE' | 'PASSAGE';
  grade: 'P1';
  school: string;
  teacher_id: string;
}

export interface ExamResult {
  id: string;
  studentId: string;
  subject: Subject | string;
  score: number;
  totalQuestions: number;
  timestamp: number;
  assignmentId?: string;
}

export interface Assignment {
  id: string;
  school: string;
  subject: Subject | string;
  grade?: string;
  questionCount: number;
  deadline: string; 
  createdBy: string;
}
