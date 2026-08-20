import React, { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded border border-slate-200 overflow-hidden print:overflow-visible print:border-none print:shadow-none ${className}`}>
      {children}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }) {
  const baseStyle = "px-3 py-1.5 text-xs font-medium rounded transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 shadow-sm";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    outline: "bg-transparent border border-slate-200 hover:bg-slate-50 text-slate-600"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Label({ children, className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider ${className}`} {...props}>
      {children}
    </label>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> & { as?: 'input' | 'select' }) {
  const baseStyle = "w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-colors placeholder:text-slate-400";
  if (props.as === 'select') {
    return <select className={`${baseStyle} ${className}`} {...(props as any)} />;
  }
  return <input className={`${baseStyle} ${className}`} {...props} />;
}
