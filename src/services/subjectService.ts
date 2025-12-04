
import { db } from './firebaseConfig';
import { SubjectDef } from '../types';

// Helper to sanitize keys (replace special chars with _)
const cleanKey = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_');

// ดึงรายวิชาทั้งหมดของโรงเรียนจาก Firebase
export const getSchoolSubjects = async (schoolName: string): Promise<SubjectDef[]> => {
  try {
    const key = cleanKey(schoolName);
    const snapshot = await db.ref(`schools/${key}/subjects`).once('value');
    const data = snapshot.val();
    if (data) {
      // Firebase returns an object with keys, convert to array
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

// No default hardcoded subjects anymore. Everything must come from DB.
export const DEFAULT_SUBJECTS: SubjectDef[] = [];
