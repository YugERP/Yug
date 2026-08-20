import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, Button, Label, Input } from '../components/UI';
import { GraduationCap } from 'lucide-react';

export function Login() {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(email, password)) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-600/20">
            <GraduationCap className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Yug Technology</h1>
          <p className="mt-3 text-slate-500 font-medium">Please enter your credentials to login.</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded">{error}</div>}
            <div>
              <Label>Login ID</Label>
              <Input type="text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter Login ID" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full mt-2">Sign In</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
