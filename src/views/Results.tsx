
import React, { useEffect, useState } from 'react';
import { Star, RefreshCw, Home, CheckCircle, Clock } from 'lucide-react';
import { speak } from '../utils/soundUtils';

interface ResultsProps {
  score: number;
  total: number;
  isHomework?: boolean;
  isGame?: boolean; // New prop
  onRetry: () => void;
  onHome: () => void;
}

const Results: React.FC<ResultsProps> = ({ score, total, isHomework = false, isGame = false, onRetry, onHome }) => {
  const percentage = (score / total) * 100;
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (percentage >= 80) {
      speak(`สุดยอดไปเลย! ภารกิจสำเร็จ ได้ ${score} เต็ม ${total} คะแนน`);
    } else if (percentage >= 50) {
      speak(`เก่งมากครับ ส่งงานเรียบร้อย ได้ ${score} คะแนน`);
    } else {
      speak(`บันทึกคะแนนเรียบร้อยครับ ได้ ${score} คะแนน สู้ต่อไปนะ`);
    }

    let timer: any;
    if (isHomework) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onHome();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [score, total, percentage, isHomework, onHome]);

  return (
    <div className="flex flex-col items-center text-center py-10 min-h-[70vh] justify-center">
      
      {isHomework && (
        <div className="mb-6 animate-bounce">
            <span className="bg-green-100 text-green-800 px-6 py-2 rounded-full font-bold text-lg border-2 border-green-300 shadow-sm flex items-center gap-2">
                <CheckCircle size={24} /> ภารกิจสำเร็จ! (บันทึกแล้ว)
            </span>
        </div>
      )}

      {isGame && (
          <div className="mb-6">
            <span className="bg-purple-100 text-purple-800 px-6 py-2 rounded-full font-bold text-lg border-2 border-purple-300 shadow-sm">
                🎮 ผลการแข่งขัน
            </span>
          </div>
      )}

      <div className="relative mb-8">
         <div className={`absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse ${percentage >= 50 ? 'bg-yellow-200' : 'bg-gray-200'}`}></div>
         <div className={`bg-white rounded-full p-8 shadow-xl relative z-10 border-4 ${percentage >= 50 ? 'border-yellow-100' : 'border-gray-100'}`}>
           <Star size={80} className={percentage >= 50 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
         </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        {percentage >= 80 ? 'ยอดเยี่ยมมาก!' : percentage >= 50 ? 'ทำได้ดีมาก!' : 'พยายามได้ดี!'}
      </h1>
      <p className="text-gray-500 mb-8">
        {isHomework ? 'ส่งการบ้านเรียบร้อยแล้ว' : isGame ? 'คะแนนจากการแข่งขัน' : 'คุณทำคะแนนได้'}
      </p>

      <div className="bg-white rounded-3xl p-8 shadow-lg border-b-4 border-blue-100 w-full max-w-sm mb-8">
        <div className="text-6xl font-black text-blue-600 mb-2">
          {score}<span className="text-2xl text-gray-400 font-medium">/{total}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
          <div 
            className={`h-4 rounded-full transition-all duration-1000 ${percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-400">ความแม่นยำ {Math.round(percentage)}%</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        
        {isHomework ? (
            <button 
                onClick={onHome}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
                <Home size={20} /> กลับหน้าหลักทันที ({countdown})
            </button>
        ) : (
            <div className="flex gap-4">
                <button 
                onClick={onHome}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${isGame ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                >
                <Home size={20} /> หน้าหลัก
                </button>
                {!isGame && (
                    <button 
                    onClick={onRetry}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                    >
                    <RefreshCw size={20} /> ทำอีกครั้ง
                    </button>
                )}
            </div>
        )}
        
        {isHomework && (
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <Clock size={12} /> ระบบจะกลับหน้าหลักอัตโนมัติ
            </p>
        )}
      </div>
    </div>
  );
};

export default Results;
