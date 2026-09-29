import React from 'react';
import { ArrowLeft, ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[65vh] flex items-center justify-center">
      <div className="max-w-md text-center rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldX className="w-6 h-6 text-red-400" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-100">Access denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your platform account does not have the role or permission required for this page.
        </p>
        <button
          onClick={() => navigate('/platform')}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>
      </div>
    </div>
  );
};
