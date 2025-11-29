import React, { useState } from 'react';
import { Student } from '../types';
import { AlertCircle, GraduationCap } from 'lucide-react';

interface LoginProps {
  onLogin: (student: Student) => void;
  onTeacherLoginClick: () => void;
  students: Student[];
}

const Login: React.FC<LoginProps> = ({ onLogin, onTeacherLoginClick, students }) => {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);

  const handleNumberClick = (num: string) => {
    if (inputCode.length < 5) {
      const newCode = inputCode + num;
      setInputCode(newCode);
      setError('');
      
      if (newCode.length === 5) {
        checkStudent(newCode);
      }
    }
  };

  const handleBackspace = () => {
    setInputCode(prev => prev.slice(0, -1));
    setError('');
    setFoundStudent(null);
  };

  const checkStudent = (code: string) => {
    const student = students.find(s => String(s.id).trim() === code);
    
    if (student) {
      setFoundStudent(student);
      setTimeout(() => {
        onLogin(student);
      }, 1500);
    } else {
      setError(`ไม่พบข้อมูลรหัส ${code}`);
      setFoundStudent(null);
      setTimeout(() => {
        setInputCode('');
        setError('');
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] relative pb-10">
      
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce delay-700">✏️</div>
      <div className="absolute bottom-20 right-10 text-6xl opacity-20 animate-bounce">🎨</div>
      <div className="absolute top-40 right-10 text-4xl opacity-20 animate-pulse">⭐</div>

      <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[40px] shadow-2xl w-full max-w-md border-8 border-yellow-200 relative z-10">
        
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-blue-50 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-blue-200 shadow-inner">
             <img src="https://cdn-icons-png.flaticon.com/512/2921/2921226.png" alt="Kids Logo" className="w-16 h-16" />
          </div>
          <h2 className="text-3xl font-black text-pink-500 mb-2 font-fun tracking-wide">Thai for children</h2>
          <p className="text-gray-500 font-bold">พิมพ์รหัสประจำตัว 5 หลักของหนู</p>
        </div>

        <div className="bg-gray-50 rounded-3xl p-4 mb-6 h-28 flex items-center justify-center border-2 border-gray-100 shadow-inner">
          {foundStudent ? (
            <div className="flex flex-col items-center animate-bounce">
              <span className="text-5xl mb-2 filter drop-shadow-md">{foundStudent.avatar}</span>
              <span className="text-xl font-bold text-blue-600 bg-blue-50 px-4 py-1 rounded-full">{foundStudent.name}</span>
            </div>
          ) : (
            <span className="text-6xl font-mono tracking-[0.3em] text-gray-300 font-bold pl-4">
              {inputCode.padEnd(5, '•')}
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-red-500 mb-4 text-sm font-bold bg-red-50 p-3 rounded-2xl animate-pulse border border-red-100">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              onClick={() => handleNumberClick(num.toString())} 
              className="bg-white border-b-4 border-blue-200 text-blue-500 shadow-sm active:shadow-none active:translate-y-1 active:border-b-0 rounded-2xl p-3 md:p-4 text-3xl font-bold hover:bg-blue-50 transition-all font-fun"
            >
              {num}
            </button>
          ))}
          <div className="col-span-1"></div>
          <button onClick={() => handleNumberClick('0')} className="bg-white border-b-4 border-blue-200 text-blue-500 shadow-sm active:shadow-none active:translate-y-1 active:border-b-0 rounded-2xl p-3 md:p-4 text-3xl font-bold hover:bg-blue-50 transition-all font-fun">0</button>
          <button onClick={handleBackspace} className="bg-red-50 border-b-4 border-red-200 text-red-400 shadow-sm active:shadow-none active:translate-y-1 active:border-b-0 rounded-2xl p-3 md:p-4 text-2xl font-bold hover:bg-red-100 transition-all">⌫</button>
        </div>
        
        {/* ปุ่มครูเข้าสู่ระบบ */}
        <div className="pt-4 border-t-2 border-dashed border-gray-200">
           <button 
             onClick={onTeacherLoginClick}
             className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-purple-600 p-2 rounded-xl transition-colors group"
           >
              <div className="bg-gray-100 group-hover:bg-purple-100 p-1.5 rounded-full transition-colors text-gray-400 group-hover:text-purple-600">
                <GraduationCap size={16} />
              </div>
              <span className="font-bold text-xs">คุณครูเข้าสู่ระบบ</span>
           </button>
        </div>
      </div>
    </div>
  );
};

export default Login;