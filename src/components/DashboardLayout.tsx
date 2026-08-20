import React, { useState } from 'react';
import { useStore } from '../store';
import { LogOut, GraduationCap, Menu, X } from 'lucide-react';
import { DateTimeDisplay } from './DateTimeDisplay';

interface Props {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: Props) {
  const { currentUser, logout, schools } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentUser) return null;

  const currentSchool = schools.find(s => s.id === currentUser.schoolId);
  const platformName = currentUser.role === 'MASTER_ADMIN' ? 'SUPER ADMIN CONSOLE' : (currentSchool?.name || 'SCHOOL WORKSPACE');



  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 print:bg-white print:block print:min-h-0 print:h-auto">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 flex-shrink-0 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {platformName.charAt(0)}
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-sm sm:text-base tracking-tight truncate max-w-[200px] sm:max-w-md">{platformName}</h1>
            <h2 className="font-bold text-indigo-600 uppercase text-[10px] sm:text-[11px] tracking-widest leading-none mt-0.5">{title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 capitalize">{currentUser.role.toLowerCase()}</p>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
          <div className="flex flex-col items-end gap-0.5">
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
            <DateTimeDisplay />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:h-auto">
        <div className="mx-auto space-y-6 print:space-y-0 print:m-0 print:w-full print:max-w-none">
          <div className="sm:hidden mb-2 border-b border-slate-200 pb-2 no-print">
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
