
import { db } from './firebaseConfig';
import { SubjectDef } from '../types';

// Helper to sanitize keys
const cleanKey = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_');

// ดึงรายวิชาทั้งหมดของโรงเรียน
export const getSchoolSubjects = async (schoolName: string): Promise<SubjectDef[]> => {
  try {
    const key = cleanKey(schoolName);
    const snapshot = await db.ref(`schools/${key}/subjects`).once('value');
    const data = snapshot.val();
    if (data) {
      return Object.values(data);
    }
    return [];
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return [];
  }
};

// เพิ่มรายวิชาใหม่
export const addSubject = async (schoolName: string, name: string, grade: string, color: string, icon: string): Promise<boolean> => {
  try {
    const key = cleanKey(schoolName);
    const newRef = db.ref(`schools/${key}/subjects`).push();
    await newRef.set({
      id: newRef.key,
      name,
      grade,
      color,
      icon,
      school: schoolName
    });
    return true;
  } catch (error) {
    console.error("Error adding subject:", error);
    return false;
  }
};

// ลบรายวิชา
export const deleteSubject = async (schoolName: string, subjectId: string): Promise<boolean> => {
  try {
    const key = cleanKey(schoolName);
    await db.ref(`schools/${key}/subjects/${subjectId}`).remove();
    return true;
  } catch (error) {
    console.error("Error deleting subject:", error);
    return false;
  }
};

// รายวิชาเริ่มต้น (Defaults) - เหลือไว้แค่ตัวอย่าง (หรือลบ P2 ออกตามโจทย์)
export const DEFAULT_SUBJECTS: SubjectDef[] = [
    // เหลือไว้เฉพาะ P1 หากต้องการ หรือปล่อยว่างไว้
    { id: 'def_p1_1', name: 'พยัญชนะไทย', grade: 'P1', color: 'red', icon: '🅰️', school: 'CENTER' },
    { id: 'def_p1_2', name: 'สระไทย', grade: 'P1', color: 'yellow', icon: '🅾️', school: 'CENTER' },
    { id: 'def_p1_3', name: 'การผันวรรณยุกต์', grade: 'P1', color: 'green', icon: '🎵', school: 'CENTER' },
    { id: 'def_p1_4', name: 'มาตราตัวสะกด', grade: 'P1', color: 'blue', icon: '🧩', school: 'CENTER' },
    { id: 'def_p1_5', name: 'คำพื้นฐาน ป.1', grade: 'P1', color: 'purple', icon: '📖', school: 'CENTER' },
    
    // P2 ถูกลบออกแล้ว เพื่อให้ครูสร้างเอง
];
