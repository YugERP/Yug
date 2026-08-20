import React from 'react';
import { StoreProvider, useStore } from './store';
import { Login } from './pages/Login';
import { DashboardLayout } from './components/DashboardLayout';
import { AdminPanel } from './pages/AdminPanel';
import { TeacherPanel } from './pages/TeacherPanel';
import { StudentPanel } from './pages/StudentPanel';
import { ClerkPanel } from './pages/ClerkPanel';
import { MasterAdminPanel } from './pages/MasterAdminPanel';
import { ParentPanel } from './pages/ParentPanel';

function AppContent() {
  const { currentUser, schools } = useStore();

  if (!currentUser) {
    return <Login />;
  }

  // Prevent rendering before school metadata is loaded from Firestore to avoid layout flicker
  if (schools.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-500 tracking-wider uppercase">Loading Workspace...</p>
      </div>
    );
  }

  const getDashboardTitle = () => {
    switch (currentUser.role) {
      case 'MASTER_ADMIN': return 'Super Administrator Console';
      case 'ADMIN': return 'School Admin Dashboard';
      case 'TEACHER': return 'Teacher Dashboard';
      case 'STUDENT': return 'Student Portal';
      case 'CLERK': return 'Fee Management (Clerk)';
      case 'PARENT': return 'Parent Portal';
      default: return 'Dashboard';
    }
  };
  
  const currentSchool = schools.find(s => s.id === currentUser.schoolId);
  const titleString = currentSchool ? `${getDashboardTitle()} - ${currentSchool.name}` : getDashboardTitle();

  return (
    <DashboardLayout title={titleString}>
      {currentUser.role === 'MASTER_ADMIN' && <MasterAdminPanel />}
      {currentUser.role === 'ADMIN' && <AdminPanel />}
      {currentUser.role === 'TEACHER' && <TeacherPanel />}
      {currentUser.role === 'STUDENT' && <StudentPanel />}
      {currentUser.role === 'CLERK' && <ClerkPanel />}
      {currentUser.role === 'PARENT' && <ParentPanel />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
