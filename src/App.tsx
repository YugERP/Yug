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
