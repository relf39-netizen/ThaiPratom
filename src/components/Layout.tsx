import React from 'react';
import { BookOpen, Trophy, BarChart, LogOut, Music, Volume2, VolumeX, Home } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  studentName?: string;
  onLogout: () => void;
  isMusicOn: boolean;
  toggleMusic: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  studentName, 
  onLogout, 
  isMusicOn, 
  toggleMusic,
  currentPage,
  onNavigate
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-pink-50 to-sky-100 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b-4 border-yellow-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="bg-gradient-to-br from-pink-400 to-orange-400 p-2 rounded-2xl shadow-md hover:scale-105 transition-transform">
              {/* Logo Image */}
              <img src="https://cdn-icons-png.flaticon.com/512/2921/2921226.png" alt="Logo" className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-pink-500 font-fun tracking-wide hidden md:block">Thai for children</h1>
              <h1 className="text-xl font-black text-pink-500 font-fun md:hidden">Thai Kids</h1>
            </div>
          </div>

          {studentName && (
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleMusic}
                className={`p-2 rounded-full border-2 transition-all active:scale-95 ${isMusicOn ? 'bg-green-100 text-green-600 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
              >
                {isMusicOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border-2 border-blue-200 shadow-sm">
                <span className="text-sm font-bold text-blue-800 truncate max-w-[100px] md:max-w-none font-fun">
                  {studentName}
                </span>
              </div>
              
              <button onClick={onLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-lg md:hidden">
                <LogOut size={20} />
              </button>
              <button onClick={onLogout} className="hidden md:flex items-center gap-1 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 bg-white shadow-sm text-sm font-bold transition-colors">
                <LogOut size={16} /> ออก
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {studentName && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-yellow-200 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] rounded-t-3xl z-40">
          <div className="flex justify-around py-3 px-2">
            <NavItem 
              icon={<Home size={24} />} 
              label="หน้าหลัก" 
              isActive={currentPage === 'dashboard'} 
              color="text-pink-500"
              onClick={() => onNavigate('dashboard')} 
            />
            <NavItem 
              icon={<BookOpen size={24} />} 
              label="ฝึกฝน" 
              isActive={currentPage === 'practice'} 
              color="text-blue-500"
              onClick={() => onNavigate('dashboard')} // Dashboard handles practice selection now
            />
            <NavItem 
              icon={<Trophy size={24} />} 
              label="เกม" 
              isActive={currentPage === 'game'} 
              color="text-purple-500"
              onClick={() => onNavigate('game')} 
            />
            <NavItem 
              icon={<BarChart size={24} />} 
              label="สถิติ" 
              isActive={currentPage === 'stats'} 
              color="text-green-500"
              onClick={() => onNavigate('stats')} 
            />
          </div>
        </nav>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; color: string; onClick: () => void }> = ({ icon, label, isActive, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${isActive ? `bg-gray-50 ${color}` : 'text-gray-400 hover:text-gray-600'}`}
  >
    <div className={`${isActive ? 'scale-110 drop-shadow-sm' : ''} transition-transform`}>
      {icon}
    </div>
    <span className={`text-[10px] font-bold ${isActive ? color : ''}`}>{label}</span>
  </button>
);

export default Layout;