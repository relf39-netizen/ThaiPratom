
import React from 'react';
import { Subject } from '../types';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface SubjectSelectionProps {
  onSelectSubject: (subject: Subject) => void;
  onBack: () => void;
}

const SubjectSelection: React.FC<SubjectSelectionProps> = ({ onSelectSubject, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto min-h-[80vh] flex flex-col items-center justify-center text-center">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6 absolute top-20 left-4 md:left-20">
        <ArrowLeft size={20} /> กลับหน้าหลัก
      </button>

      <div className="bg-white p-10 rounded-3xl shadow-xl border-4 border-blue-100 animate-fade-in">
         <BookOpen size={64} className="text-blue-500 mx-auto mb-4"/>
         <h2 className="text-2xl font-bold text-gray-800 mb-2">กรุณาเลือกวิชาจากหน้าหลัก</h2>
         <p className="text-gray-500 mb-6">ระบบได้ปรับปรุงให้แสดงรายวิชาที่หน้าหลักโดยตรง เพื่อความสะดวกครับ</p>
         <button onClick={onBack} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
             กลับไปที่แดชบอร์ด
         </button>
      </div>
    </div>
  );
};

export default SubjectSelection;
