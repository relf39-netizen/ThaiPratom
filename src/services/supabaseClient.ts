
import { createClient } from '@supabase/supabase-js';

// 🟢 วิธีการตั้งค่า Supabase:
// 1. ไปที่ https://supabase.com/dashboard
// 2. สร้าง Project ใหม่ (New Project)
// 3. ไปที่เมนู Project Settings (รูปเฟือง) -> API
// 4. ก๊อปปี้ "Project URL" มาใส่ที่ตัวแปร SUPABASE_URL ด้านล่าง
// 5. ก๊อปปี้ "anon" / "public" Key มาใส่ที่ตัวแปร SUPABASE_ANON_KEY ด้านล่าง

const SUPABASE_URL = 'https://jkzxorkcvrrhnjhuobhx.supabase.co' as string; // 👈 นำ URL มาวางทับตรงนี้ (ต้องมี ' ' ครอบ)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprenhvcmtjdnJyaG5qaHVvYmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NDM2MzMsImV4cCI6MjA4MTExOTYzM30.yjCXMz7dniZ-f66MnBwawaBeAJh_ZuLQVHTWtor-acc' as string; // 👈 นำ Key ยาวๆ มาวางทับตรงนี้

// ตรวจสอบว่าได้ตั้งค่าหรือยัง
const isConfigured = 
  SUPABASE_URL && 
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
  !SUPABASE_URL.includes('YOUR_SUPABASE_URL') &&
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

if (!isConfigured) {
  console.warn('⚠️ ยังไม่ได้ตั้งค่า Supabase URL/KEY ระบบจะใช้ข้อมูลจำลอง (Mock Data) แทนชั่วคราว');
}

// สร้าง Client โดยป้องกันไม่ให้แอปพังถ้ายังไม่ใส่ Key (ใช้ค่า placeholder ชั่วคราว)
export const supabase = createClient(
  isConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co',
  isConfigured ? SUPABASE_ANON_KEY : 'placeholder-key'
);
