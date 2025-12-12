
import React, { useState } from 'react';
import { Student } from '../types';
import { ArrowLeft, Star, ShoppingBag, Lock, Check } from 'lucide-react';
import { redeemReward } from '../services/api';
import { speak } from '../utils/soundUtils';

interface RewardShopProps {
  student: Student;
  onBack: () => void;
  onUpdateStudent: (updatedStudent: Student) => void;
}

// รายการของรางวัล (Mock Data)
const REWARDS = [
    { id: 'doll_bear', name: 'ตุ๊กตาหมี', price: 3, icon: '🧸', color: 'bg-amber-100 text-amber-600' },
    { id: 'candy_cane', name: 'อมยิ้ม', price: 5, icon: '🍭', color: 'bg-pink-100 text-pink-600' },
    { id: 'car_toy', name: 'รถบังคับ', price: 10, icon: '🏎️', color: 'bg-red-100 text-red-600' },
    { id: 'magic_sword', name: 'ดาบกายสิทธิ์', price: 20, icon: '⚔️', color: 'bg-blue-100 text-blue-600' },
    { id: 'robot_cool', name: 'หุ่นยนต์เท่ๆ', price: 50, icon: '🤖', color: 'bg-gray-100 text-gray-600' },
    { id: 'unicorn', name: 'ยูนิคอร์น', price: 100, icon: '🦄', color: 'bg-purple-100 text-purple-600' },
    { id: 'crown_gold', name: 'มงกุฎทอง', price: 200, icon: '👑', color: 'bg-yellow-100 text-yellow-600' },
    { id: 'rocket', name: 'จรวดอวกาศ', price: 500, icon: '🚀', color: 'bg-indigo-100 text-indigo-600' },
];

const RewardShop: React.FC<RewardShopProps> = ({ student, onBack, onUpdateStudent }) => {
  const [processing, setProcessing] = useState<string | null>(null);

  const inventory = student.inventory || [];

  const handleBuy = async (item: typeof REWARDS[0]) => {
      if (student.stars < item.price) {
          speak("ดาวไม่พอครับ ต้องสะสมเพิ่มนะ");
          return;
      }
      
      if (inventory.includes(item.id)) return;

      if (!window.confirm(`ยืนยันการแลก "${item.name}" ด้วย ${item.price} ดาว?`)) return;

      setProcessing(item.id);
      
      const result = await redeemReward(student.id, item.id, item.price);
      
      if (result.success) {
          speak(`แลก ${item.name} สำเร็จแล้วครับ`);
          
          // Update Local State immediately
          const updatedStudent = {
              ...student,
              stars: student.stars - item.price,
              inventory: [...inventory, item.id]
          };
          onUpdateStudent(updatedStudent);
      } else {
          alert(result.message);
      }
      setProcessing(null);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            <button onClick={onBack} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 font-bold">
                <ArrowLeft size={24} /> กลับหน้าหลัก
            </button>
            <div className="bg-white px-4 py-2 rounded-full shadow-md border-2 border-yellow-200 flex items-center gap-2">
                <span className="text-gray-500 text-sm font-bold">ดาวสะสม:</span>
                <Star className="text-yellow-400 fill-yellow-400" size={24} />
                <span className="text-2xl font-black text-yellow-500">{student.stars}</span>
            </div>
        </div>

        <div className="text-center mb-8">
            <div className="inline-block p-4 bg-purple-100 rounded-full mb-4 shadow-inner">
                <ShoppingBag size={48} className="text-purple-600" />
            </div>
            <h2 className="text-3xl font-black text-purple-700 font-fun drop-shadow-sm">ร้านค้าดวงดาว</h2>
            <p className="text-gray-500 font-bold">สะสมดาวมาแลกของรางวัลสุดพิเศษ!</p>
        </div>

        {/* Inventory (Small Preview) */}
        {inventory.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-blue-100 mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 p-1.5 rounded-lg">🎒</span> กระเป๋าของฉัน ({inventory.length} ชิ้น)
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {REWARDS.filter(r => inventory.includes(r.id)).map(item => (
                        <div key={item.id} className="flex flex-col items-center min-w-[80px]">
                            <div className="text-4xl bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-gray-100 shadow-inner mb-2">
                                {item.icon}
                            </div>
                            <span className="text-xs font-bold text-gray-600">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Shop Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {REWARDS.map((item) => {
                const isOwned = inventory.includes(item.id);
                const canAfford = student.stars >= item.price;
                const isProcessing = processing === item.id;

                return (
                    <div 
                        key={item.id} 
                        className={`relative bg-white rounded-3xl p-4 border-b-8 transition-all duration-300 flex flex-col items-center text-center
                            ${isOwned 
                                ? 'border-green-200 opacity-80' 
                                : canAfford 
                                    ? 'border-purple-200 hover:-translate-y-1 hover:shadow-xl hover:border-purple-300' 
                                    : 'border-gray-200 bg-gray-50 opacity-70'
                            }
                        `}
                    >
                        {/* Status Badge */}
                        {isOwned && (
                            <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1 shadow">
                                <Check size={16} />
                            </div>
                        )}
                        {!isOwned && !canAfford && (
                            <div className="absolute top-3 right-3 bg-gray-300 text-white rounded-full p-1">
                                <Lock size={16} />
                            </div>
                        )}

                        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-6xl mb-3 shadow-inner ${item.color} ${!isOwned && !canAfford ? 'grayscale' : ''}`}>
                            {item.icon}
                        </div>
                        
                        <h3 className="font-bold text-gray-800 text-lg mb-1">{item.name}</h3>
                        
                        {!isOwned ? (
                            <button 
                                onClick={() => handleBuy(item)}
                                disabled={!canAfford || isProcessing}
                                className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all mt-auto
                                    ${canAfford 
                                        ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-md active:scale-95' 
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                {isProcessing ? '...' : (
                                    <>
                                        <Star size={16} fill="currentColor" /> {item.price}
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="mt-auto w-full py-2 rounded-xl font-bold bg-green-100 text-green-700 text-sm">
                                มีแล้ว
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default RewardShop;
