
import React, { useState, useEffect } from 'react';
import { RTReadingItem, Student } from '../types';
import { ArrowLeft, Volume2, Star, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { getRTReadingData, saveRTResult } from '../services/api';
import { speak, playSFX } from '../utils/soundUtils';

interface RTReadingAloudProps {
  student: Student;
  onBack: () => void;
  onUpdateStars: (newStars: number) => void;
}

const RTReadingAloud: React.FC<RTReadingAloudProps> = ({ student, onBack, onUpdateStars }) => {
  const [items, setItems] = useState<RTReadingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentType, setCurrentType] = useState<'WORD' | 'SENTENCE' | 'PASSAGE'>('WORD');
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(true);

  const fetchItems = async (type: 'WORD' | 'SENTENCE' | 'PASSAGE') => {
    setLoading(true);
    setCurrentType(type);
    setItems([]); // ล้างค่าเก่าทิ้งก่อน
    try {
        const data = await getRTReadingData(student.school || 'Admin School', type);
        
        if (!data || data.length === 0) {
            alert(`ไม่พบข้อมูลคำศัพท์ในหมวดนี้จ้ะ\nกรุณาเพิ่มข้อมูลใน "เมนูครู > เตรียมสอบ RT" ก่อนนะจ๊ะ`);
            setShowModeSelection(true);
            return;
        }

        // สุ่มมา 10 ข้อ
        const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, 10);
        setItems(shuffled);
        setCurrentIndex(0);
        setIsFinished(false);
        setShowModeSelection(false);
        speak(`เริ่มฝึกอ่านหมวด ${type === 'WORD' ? 'คำศัพท์' : type === 'SENTENCE' ? 'ประโยค' : 'ข้อความ'} จ้ะ`);
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
        setLoading(false);
    }
  };

  const handleNext = async () => {
    // ตรวจสอบความพร้อมของข้อมูลก่อนดำเนินการ
    if (isSaving || items.length === 0 || !items[currentIndex]) return;
    
    setIsSaving(true);
    const item = items[currentIndex];
    
    try {
        const success = await saveRTResult(student.id, item.id, 1);
        if (success) {
            onUpdateStars(student.stars + 1);
        }
    } catch (err) {
        console.error("Save RT Result Error", err);
    }
    
    setIsSaving(false);
    playSFX('CORRECT');
    
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      speak("เก่งที่สุดเลยจ้ะ ภารกิจสำเร็จแล้ว!");
    }
  };

  const handleSpeak = () => {
    const textToRead = items[currentIndex]?.text;
    if (textToRead) {
      speak(textToRead);
    }
  };

  // กรองหน้าจอแสดงผล
  if (showModeSelection) {
      return (
          <div className="max-w-4xl mx-auto animate-fade-in pb-10">
              <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-black mb-6 hover:text-pink-500 transition-colors">
                  <ArrowLeft size={20}/> กลับหน้าหลัก
              </button>
              <div className="text-center mb-10">
                  <div className="text-8xl mb-4 animate-bounce">🦉</div>
                  <h2 className="text-3xl font-black text-gray-800 font-fun">เลือกโหมดการฝึกอ่านนะจ๊ะ</h2>
                  <p className="text-gray-400 font-bold mt-2">สะสมดาวจากการอ่านคำศัพท์ให้ถูกต้อง</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                  <button onClick={() => fetchItems('WORD')} className="group p-10 bg-orange-50 rounded-[40px] border-4 border-orange-200 font-black text-2xl hover:scale-105 hover:bg-orange-100 transition shadow-lg text-orange-700 flex flex-col items-center gap-3">
                      <span className="text-5xl group-hover:rotate-12 transition-transform">📝</span>
                      อ่านเป็นคำ
                  </button>
                  <button onClick={() => fetchItems('SENTENCE')} className="group p-10 bg-sky-50 rounded-[40px] border-4 border-sky-200 font-black text-2xl hover:scale-105 hover:bg-sky-100 transition shadow-lg text-sky-700 flex flex-col items-center gap-3">
                      <span className="text-5xl group-hover:rotate-12 transition-transform">💬</span>
                      อ่านประโยค
                  </button>
                  <button onClick={() => fetchItems('PASSAGE')} className="group p-10 bg-emerald-50 rounded-[40px] border-4 border-emerald-200 font-black text-2xl hover:scale-105 hover:bg-emerald-100 transition shadow-lg text-emerald-700 flex flex-col items-center gap-3">
                      <span className="text-5xl group-hover:rotate-12 transition-transform">📖</span>
                      อ่านข้อความ
                  </button>
              </div>
          </div>
      );
  }

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-sky-500">
              <Loader2 className="animate-spin mb-4" size={64} />
              <p className="font-black text-2xl font-fun">กำลังเตรียมคำศัพท์นะจ๊ะ...</p>
          </div>
      );
  }

  if (isFinished) {
      return (
          <div className="max-w-2xl mx-auto text-center py-10 animate-fade-in px-4">
              <div className="bg-white rounded-[50px] p-10 shadow-2xl border-8 border-yellow-100">
                  <div className="text-9xl mb-6">🎉</div>
                  <h2 className="text-4xl font-black text-gray-800 font-fun mb-6">สุดยอดไปเลย!</h2>
                  <div className="bg-yellow-50 rounded-3xl p-6 mb-10 flex items-center justify-center gap-4 border-2 border-yellow-200">
                      <Star className="text-yellow-400 fill-yellow-400" size={48}/>
                      <span className="text-5xl font-black text-yellow-600">+{items.length}</span>
                  </div>
                  <button onClick={() => setShowModeSelection(true)} className="w-full py-5 bg-sky-500 text-white rounded-2xl font-black text-xl shadow-xl hover:bg-sky-600 hover:-translate-y-1 transition active:scale-95">ฝึกหมวดอื่นต่อ</button>
              </div>
          </div>
      );
  }

  // ตัวแปรปัจจุบัน (ใช้ Optional Chaining เสมอ)
  const currentItem = items[currentIndex];

  if (!currentItem && !loading) {
      return (
          <div className="max-w-md mx-auto text-center py-20 bg-white rounded-3xl shadow-lg border-2 border-red-100 p-8">
              <AlertCircle size={64} className="mx-auto text-red-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">ข้อมูลยังไม่พร้อมจ้ะ</h2>
              <button onClick={() => setShowModeSelection(true)} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">กลับไปเลือกโหมด</button>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 animate-fade-in">
      <div className="bg-white rounded-[50px] p-8 md:p-16 shadow-2xl text-center border-b-[16px] border-sky-100 relative overflow-hidden">
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-sky-50 px-4 py-1 rounded-full text-sm font-black text-sky-600 border border-sky-100 shadow-sm">
              ข้อที่ {currentIndex + 1} จาก {items.length}
          </div>
          
          <h1 className={`font-fun font-black text-gray-800 mb-12 mt-4 break-words leading-tight ${currentType === 'WORD' ? 'text-7xl md:text-9xl' : 'text-4xl md:text-6xl'}`}>
              {currentItem?.text || '...'}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={handleSpeak} 
                className="py-6 bg-white border-4 border-sky-200 text-sky-600 rounded-[32px] font-black text-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-sky-50 hover:border-sky-300 transition active:scale-95"
              >
                <Volume2 size={32}/> ฟังเสียง
              </button>
              <button 
                onClick={handleNext} 
                disabled={isSaving || !currentItem} 
                className="py-6 bg-emerald-500 text-white rounded-[32px] font-black text-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-emerald-600 hover:-translate-y-1 transition active:scale-95 disabled:opacity-50 disabled:translate-y-0"
              >
                  {isSaving ? <Loader2 className="animate-spin"/> : <><CheckCircle2 size={32}/> อ่านแล้วจ้ะ</>}
              </button>
          </div>
          
          <div className="mt-8">
              <button onClick={() => setShowModeSelection(true)} className="text-gray-400 font-bold hover:text-gray-600 underline text-sm transition-colors">เปลี่ยนโหมดการอ่าน</button>
          </div>
      </div>
    </div>
  );
};

export default RTReadingAloud;
