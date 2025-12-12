
import { supabase } from './supabaseClient';
import { SubjectDef } from '../types';

export const getSchoolSubjects = async (schoolName: string): Promise<SubjectDef[]> => {
  try {
    const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('school', schoolName);
    return data || [];
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return [];
  }
};

export const addSubject = async (schoolName: string, name: string, grade: string, color: string, icon: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('subjects').insert([{
      name,
      grade,
      color,
      icon,
      school: schoolName
    }]);
    return !error;
  } catch (error) {
    console.error("Error adding subject:", error);
    return false;
  }
};

export const deleteSubject = async (schoolName: string, subjectId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
    return !error;
  } catch (error) {
    console.error("Error deleting subject:", error);
    return false;
  }
};

export const DEFAULT_SUBJECTS: SubjectDef[] = [];
