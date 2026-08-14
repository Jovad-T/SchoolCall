import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// 사용자가 나중에 설정값을 입력할 수 있도록 비워둔 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBDSR5PlGMZv6lUex279A4yWYL_QVmwKUs",
  authDomain: "schoolcallapp-cdb3d.firebaseapp.com",
  databaseURL: "https://schoolcallapp-cdb3d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "schoolcallapp-cdb3d",
  storageBucket: "schoolcallapp-cdb3d.firebasestorage.app",
  messagingSenderId: "18583169071",
  appId: "1:18583169071:web:bb43ad116d189f1a1bbeda"
};

// 설정값이 하나라도 입력되어 있다면 Firebase를 초기화합니다.
const isConfigured = firebaseConfig.apiKey !== "";

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = isConfigured ? getDatabase(app) : null;
