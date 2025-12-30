
import React from 'react';
import { Mic, BookText, BarChart3, ArrowLeft, Star, Volume2, Sparkles, Trophy, Target, Heart } from 'lucide-react';
import { speak } from '../utils/soundUtils';

interface RTDashboardProps {
  onBack: () => void;
  onNavigate: (subPage: string) => void;
}

const RTDashboard: React.FC<RTDashboardProps> = ({ onBack, onNavigate }) => {
  
  const handleMenuClick = (title: string, route: string) => {
    speak(`เข้าสู่โหมด ${title} ครับ`);
    onNavigate(route);
  };

  return (
    <div className="min-h-[80vh] pb-10 animate-fade-in px-2 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack} 
          className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl text-gray-500 shadow-sm border-2 border-pink-100 hover:text-pink-500 hover:border-pink-300 transition-all active:scale-90"
        >
          <ArrowLeft size={28} />
        </button>
        
        <div className="flex flex-col items-center">
            <div className="bg-white px-8 py-2 rounded-full shadow-lg border-b-4 border-pink-400">
                <span className="text-2xl font-black text-pink-500 font-fun tracking-wider">ภารกิจเตรียมสอบ RT</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
                <div className="h-1 w-8 bg-pink-300 rounded-full"></div>
                <div className="h-1 w-2 bg-pink-200 rounded-full"></div>
            </div>
        </div>
        
        <div className="hidden md:block w-14"></div>
      </div>

      {/* Mascot Guidance Section */}
      <div className="relative bg-white rounded-[50px] p-8 mb-10 shadow-2xl border-t-8 border-sky-400 overflow-hidden group hover:shadow-sky-100 transition-all duration-500">
         <div className="absolute -top-10 -right-10 text-yellow-200 opacity-30 rotate-12 group-hover:scale-125 transition-transform duration-1000">
            <Sparkles size={150} />
         </div>
         <div className="absolute bottom-[-20px] left-[-20px] text-pink-100 opacity-20 group-hover:rotate-45 transition-transform duration-1000">
            <Heart size={100} fill="currentColor" />
         </div>

         <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
            <div className="text-[10rem] md:text-9xl animate-bounce drop-shadow-2xl select-none">🦉</div>
            <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-black text-sky-600 font-fun mb-3">สวัสดีจ้ะเด็กๆ!</h2>
                <p className="text-gray-500 font-bold text-xl leading-relaxed">
                   พี่นกฮูกจะพาหนูไปพิชิตข้อสอบ RT ให้ได้คะแนนเต็มเลย! <br className="hidden md:block"/> 
                   หนูอยากฝึกอ่านออกเสียง หรืออยากลองทำข้อสอบอ่านรู้เรื่องก่อนดีจ๊ะ?
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black">#อ่านเก่ง</span>
                    <span className="bg-sky-100 text-sky-600 px-3 py-1 rounded-full text-xs font-black">#เข้าใจง่าย</span>
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-black">#รับดาวเยอะ</span>
                </div>
            </div>
         </div>
      </div>

      {/* 3 Main Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* 1. ฝึกอ่านออกเสียง */}
        <button 
          onClick={() => handleMenuClick('ฝึกอ่านออกเสียง', 'rt-reading-aloud')}
          className="group relative bg-white rounded-[50px] p-10 shadow-xl hover:shadow-2xl transition-all border-b-[14px] border-orange-200 hover:border-orange-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-6"
        >
          <div className="absolute top-4 right-6 text-orange-200 opacity-40 group-hover:opacity-100 transition-opacity">
            <Target size={24} />
          </div>
          <div className="w-28 h-28 bg-gradient-to-br from-orange-50 to-orange-100 rounded-[35px] flex items-center justify-center text-orange-500 group-hover:from-orange-500 group-hover:to-orange-600 group-hover:text-white transition-all transform group-hover:rotate-6 group-hover:scale-110 shadow-inner">
            <Mic size={56} fill="currentColor" />
          </div>
          <div className="text-center">
             <h3 className="text-3xl font-black text-gray-800 mb-2 font-fun">ฝึกอ่านออกเสียง</h3>
             <p className="text-gray-400 text-base font-bold leading-tight">อ่านเป็นคำและประโยค <br/> ให้ถูกต้องตามหลักภาษา</p>
          </div>
          <div className="w-full h-1 bg-orange-50 rounded-full mt-2 overflow-hidden">
             <div className="w-2/3 h-full bg-orange-200"></div>
          </div>
        </button>

        {/* 2. ฝึกอ่านรู้เรื่อง */}
        <button 
          onClick={() => handleMenuClick('ฝึกอ่านรู้เรื่อง', 'rt-comprehension')}
          className="group relative bg-white rounded-[50px] p-10 shadow-xl hover:shadow-2xl transition-all border-b-[14px] border-sky-200 hover:border-sky-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-6"
        >
          <div className="absolute top-4 right-6 text-sky-200 opacity-40 group-hover:opacity-100 transition-opacity">
            <Sparkles size={24} />
          </div>
          <div className="w-28 h-28 bg-gradient-to-br from-sky-50 to-sky-100 rounded-[35px] flex items-center justify-center text-sky-500 group-hover:from-sky-500 group-hover:to-sky-600 group-hover:text-white transition-all transform group-hover:scale-110 group-hover:rotate-[-6deg] shadow-inner">
            <BookText size={56} fill="currentColor" />
          </div>
          <div className="text-center">
             <h3 className="text-3xl font-black text-gray-800 mb-2 font-fun">ฝึกอ่านรู้เรื่อง</h3>
             <p className="text-gray-400 text-base font-bold leading-tight">ทำข้อสอบวัดความเข้าใจ <br/> จับคู่ภาพและตอบคำถาม</p>
          </div>
          <div className="w-full h-1 bg-sky-50 rounded-full mt-2 overflow-hidden">
             <div className="w-1/2 h-full bg-sky-200"></div>
          </div>
        </button>

        {/* 3. สถิติของฉัน */}
        <button 
          onClick={() => handleMenuClick('สถิติการอ่าน', 'rt-stats')}
          className="group relative bg-white rounded-[50px] p-10 shadow-xl hover:shadow-2xl transition-all border-b-[14px] border-emerald-200 hover:border-emerald-400 active:border-b-0 active:translate-y-4 flex flex-col items-center gap-6"
        >
          <div className="absolute top-4 right-6 text-emerald-200 opacity-40 group-hover:opacity-100 transition-opacity">
            <Trophy size={24} />
          </div>
          <div className="w-28 h-28 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-[35px] flex items-center justify-center text-emerald-500 group-hover:from-emerald-500 group-hover:to-emerald-600 group-hover:text-white transition-all transform group-hover:scale-110 group-hover:rotate-[12deg] shadow-inner">
            <BarChart3 size={56} />
          </div>
          <div className="text-center">
             <h3 className="text-3xl font-black text-gray-800 mb-2 font-fun">สถิติของฉัน</h3>
             <p className="text-gray-400 text-base font-bold leading-tight">ดูความก้าวหน้า <br/> และคำที่ยังอ่านไม่คล่อง</p>
          </div>
          <div className="w-full h-1 bg-emerald-50 rounded-full mt-2 overflow-hidden">
             <div className="w-full h-full bg-emerald-200"></div>
          </div>
        </button>

      </div>

      {/* Footer Info Box */}
      <div className="mt-14 bg-gradient-to-r from-purple-50 to-pink-50 rounded-[40px] p-8 border-4 border-dashed border-purple-200 flex flex-col md:flex-row items-center gap-8 shadow-sm">
         <div className="bg-white p-5 rounded-3xl shadow-md text-purple-500 animate-pulse border-2 border-purple-100">
            <Trophy size={40} />
         </div>
         <div className="text-center md:text-left">
            <h4 className="text-2xl font-black text-purple-700 font-fun mb-1">พิชิตดาว RT! ⭐</h4>
            <p className="text-purple-600 text-lg font-bold">
               หนูรู้ไหมจ๊ะ? ทุกคำที่หนูอ่านถูกต้อง พี่นกฮูกจะให้ดาวสะสม 1 ดวงเลยน้า <br className="hidden md:block"/>
               สะสมให้ครบแล้วไปแลกของรางวัลเท่ๆ ในร้านค้ากันเถอะ!
            </p>
         </div>
      </div>
    </div>
  );
};

export default RTDashboard;
