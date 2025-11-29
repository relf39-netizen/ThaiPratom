
import React from 'react';
import { Subject } from '../types';
import { Puzzle, Music, Users, Trees, Link as LinkIcon, ArrowLeft } from 'lucide-react';

interface SubjectSelectionProps {
  onSelectSubject: (subject: Subject) => void;
  onBack: () => void;
}

const SubjectSelection: React.FC<SubjectSelectionProps> = ({ onSelectSubject, onBack }) => {
  
  const subjects = [
    { 
      id: Subject.SPELLING, 
      name: 'มาตราตัวสะกด', 
      icon: <Puzzle size={48} />, 
      color: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600',
      shadow: 'shadow-red-100',
      desc: 'ฝึกแม่ ก กา และตัวสะกด 8 มาตรา'
    },
    { 
      id: Subject.TONES, 
      name: 'การผันวรรณยุกต์', 
      icon: <Music size={48} />, 
      color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-600',
      shadow: 'shadow-yellow-100',
      desc: 'เสียงสามัญ เอก โท ตรี จัตวา'
    },
    { 
      id: Subject.CLUSTERS, 
      name: 'คำควบกล้ำ', 
      icon: <Users size={48} />, 
      color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-600',
      shadow: 'shadow-green-100',
      desc: 'ร ล ว ควบแท้และควบไม่แท้'
    },
    { 
      id: Subject.ROHAN, 
      name: 'คำที่มี รร', 
      icon: <Trees size={48} />, 
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600',
      shadow: 'shadow-blue-100',
      desc: 'อ่านคำที่ใช้ ร หัน (รร)'
    },
    { 
      id: Subject.RHYMES, 
      name: 'คำคล้องจอง', 
      icon: <LinkIcon size={48} />, 
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-600',
      shadow: 'shadow-purple-100',
      desc: 'ฝึกคำที่มีสระและตัวสะกดเดียวกัน'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto min-h-[80vh] flex flex-col">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6 w-fit">
        <ArrowLeft size={20} /> กลับหน้าหลัก
      </button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">บทเรียนภาษาไทย ป.2</h2>
        <p className="text-gray-500">เลือกเรื่องที่ต้องการฝึกฝนเลยครับ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((sub) => (
          <button
            key={sub.name}
            onClick={() => onSelectSubject(sub.id)}
            className={`group relative p-6 rounded-3xl border-4 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl flex flex-col items-center gap-4 text-center ${sub.color} ${sub.shadow}`}
          >
            <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
              {sub.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold">{sub.name}</h3>
              <p className="text-xs opacity-80 mt-1 font-medium">{sub.desc}</p>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-white/80 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                ลุย!
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubjectSelection;
