
import firebase from "firebase/compat/app";
import "firebase/compat/database";

// ---------------------------------------------------------------------------
// 🟢 นำค่าจาก Firebase Console มาใส่ตรงนี้
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBmvo4SdX_1Ldyz7HltPMKNm6MGX4L68F4",
  authDomain: "thailearn-40d7d.firebaseapp.com",
  // ⚠️ หมายเหตุ: Code ที่คุณให้มาไม่มี databaseURL ผมจึงเดาว่าเป็น Asia Southeast 1 (สิงคโปร์)
  // หากเข้าไม่ได้ ให้ไปดูที่ Firebase Console -> Realtime Database แล้วก๊อปปี้ URL มาแทนที่บรรทัดนี้ครับ
  databaseURL: "https://thailearn-40d7d-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "thailearn-40d7d",
  storageBucket: "thailearn-40d7d.firebasestorage.app",
  messagingSenderId: "233722829650",
  appId: "1:233722829650:web:c3f2b42007d02f0744788b",
  measurementId: "G-SHRFDGK4SC"
};

// เริ่มต้นระบบแบบ Compat
const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
export const db = app.database();
export { firebase };
