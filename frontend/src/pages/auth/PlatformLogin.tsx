import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid platform email address'),
  password: z.string().min(8, 'Password must contain at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const PlatformLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isHydrating,
    isAuthenticating,
    authError,
    login,
    clearAuthError,
  } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => () => clearAuthError(), [clearAuthError]);

  if (!isHydrating && user) {
    return <Navigate to="/platform" replace />;
  }

  const onSubmit = async (values: LoginForm) => {
    clearAuthError();
    try {
      await login(values.email, values.password);
      const requestedPath = (location.state as { from?: string } | null)?.from;
      navigate(requestedPath?.startsWith('/platform') ? requestedPath : '/platform', {
        replace: true,
      });
    } catch {
      // Store owns the sanitized API error shown below.
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-36 -left-28 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1px] shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full rounded-[15px] bg-[#0b0f19] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-300" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Clyptus Platform Portal</h1>
          <p className="mt-2 text-sm text-slate-400">
            Shared secure sign-in for Platform Super Admin and Platform Admin.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 backdrop-blur-xl p-6 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Platform access</h2>
              <p className="text-xs text-slate-500 mt-0.5">Your role and permissions are resolved by the server.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                {...register('email')}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="admin@clyptus.platform"
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 pl-9 pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {authError && (
              <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-indigo-600/20"
            >
              {isAuthenticating ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in securely
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-[11px] leading-relaxed text-slate-600">
          Access is limited to authorized platform personnel. Privileged actions are permission-controlled and audited.
        </p>
      </div>
    </div>
  );
};
