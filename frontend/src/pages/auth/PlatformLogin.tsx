import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Crown,
  LockKeyhole,
  ShieldCheck,
  Users,
  SlidersHorizontal,
  CircleCheck,
  LoaderCircle,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { PlatformLoginRole } from "../../services/auth.service";
import { Brand } from "../../components/common/Brand";
import workplace from "../../assets/auth-workplace.svg";

const loginSchema = z.object({
  rememberMe: z.boolean(),
  email: z.string().trim().email("Enter a valid platform email address"),
  password: z.string().min(8, "Password must contain at least 8 characters"),
});
type LoginForm = z.infer<typeof loginSchema>;
function LoginFormSection({
  role,
  disabled,
  busy,
  error,
  onLogin,
}: {
  role: PlatformLoginRole;
  disabled: boolean;
  busy: boolean;
  error: string | null;
  onLogin: (role: PlatformLoginRole, values: LoginForm) => Promise<void>;
}) {
  const name = role === "PLATFORM_SUPER_ADMIN" ? "Super Admin" : "Admin";
  const id = role === "PLATFORM_SUPER_ADMIN" ? "super-admin" : "admin";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });
  return (
    <>
      <div className="auth-heading">
        <p className="eyebrow">Platform access</p>
        <h1>{name} Login</h1>
        <p>
          Welcome back. Sign in to manage{" "}
          {role === "PLATFORM_SUPER_ADMIN"
            ? "your platform and its administrators"
            : "your daily platform operations"}
          .
        </p>
      </div>
      <form
        aria-label={`${name} Login`}
        onSubmit={handleSubmit((values) => onLogin(role, values))}
        className="auth-form"
        noValidate
      >
        <div>
          <label htmlFor={`${id}-email`} className="field-label">
            Email address
          </label>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete={`section-${id} username`}
            {...register("email")}
            className="field-input"
            placeholder={
              role === "PLATFORM_SUPER_ADMIN"
                ? "superadmin@clyptus.platform"
                : "admin@clyptus.platform"
            }
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? `${id}-email-error` : undefined}
            disabled={disabled}
          />
          {errors.email && (
            <p id={`${id}-email-error`} className="field-error">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${id}-password`} className="field-label">
            Password
          </label>
          <div className="password-field">
            <LockKeyhole aria-hidden="true" />
            <input
              id={`${id}-password`}
              type="password"
              autoComplete={`section-${id} current-password`}
              {...register("password")}
              className="field-input"
              placeholder="Enter your password"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? `${id}-password-error` : undefined
              }
              disabled={disabled}
            />
          </div>
          {errors.password && (
            <p id={`${id}-password-error`} className="field-error">
              {errors.password.message}
            </p>
          )}
        </div>
        <div>
          <label className="remember-row">
            <input
              type="checkbox"
              {...register("rememberMe")}
              disabled={disabled}
            />
            Remember me
          </label>
          <p className="remember-note">
            Stay signed in on this device for up to 30 days.
          </p>
        </div>
        {error && (
          <div role="alert" className="status-error">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={disabled}
          className="button button-primary button-large"
        >
          {busy ? (
            <>
              <LoaderCircle aria-hidden="true" className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in as {name}
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </>
  );
}

export const PlatformLogin: React.FC<{ loginRole?: PlatformLoginRole }> = ({
  loginRole,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeRole, setActiveRole] = useState<PlatformLoginRole | null>(null);
  const {
    user,
    isHydrating,
    isAuthenticating,
    authError,
    login,
    clearAuthError,
  } = useAuthStore();
  useEffect(() => () => clearAuthError(), [clearAuthError]);
  if (!isHydrating && user) return <Navigate to="/platform" replace />;
  const onLogin = async (role: PlatformLoginRole, values: LoginForm) => {
    if (isAuthenticating || isHydrating) return;
    setActiveRole(role);
    clearAuthError();
    try {
      await login(values.email, values.password, role, values.rememberMe);
      const requestedPath = (location.state as { from?: string } | null)?.from;
      navigate(
        requestedPath?.startsWith("/platform") ? requestedPath : "/platform",
        { replace: true },
      );
    } catch {
      /* Shared authentication store provides the error. */
    }
  };
  if (loginRole)
    return (
      <main className="auth-shell">
        <aside className="auth-art" aria-label="Clyptus platform">
          <img
            src={workplace}
            alt="A sunlit architectural space with terracotta arches and ascending steps"
          />
          <Brand />
          <div className="auth-art-copy">
            <h2>
              Make room for
              <br />
              what comes next.
            </h2>
            <p>
              Bring people, organizations and opportunities together with
              Clyptus.
            </p>
          </div>
        </aside>
        <div className="auth-form-panel">
          <div className="auth-form-content">
            {!isAuthenticating && (
              <Link
                to="/platform/login"
                state={location.state}
                className="text-link auth-back"
              >
                <ArrowLeft aria-hidden="true" />
                Back to portal selection
              </Link>
            )}
            {isHydrating && (
              <p role="status" className="text-muted mb-4">
                Restoring your session...
              </p>
            )}
            <LoginFormSection
              key={loginRole}
              role={loginRole}
              disabled={isAuthenticating || isHydrating}
              busy={isAuthenticating}
              error={activeRole === loginRole ? authError : null}
              onLogin={onLogin}
            />
            <p className="auth-footnote">
              Access is limited to authorized platform personnel. Your account
              permissions determine what you can manage.
            </p>
          </div>
        </div>
      </main>
    );
  return (
    <div className="portal-landing">
      <header className="public-header">
        <div className="container public-header-inner">
          <Brand />
          <span className="header-caption">
            <ShieldCheck aria-hidden="true" />
            Authorized platform access
          </span>
        </div>
      </header>
      <main className="landing-main container">
        <div className="landing-heading">
          <p className="eyebrow">One platform. Shared possibilities.</p>
          <h1>Clyptus Platform Portal</h1>
          <p>
            A clear view of your platform. Choose your workspace to manage the
            people and organizations behind it.
          </p>
        </div>
        {isHydrating && (
          <p role="status" className="text-center text-muted mb-4">
            Restoring your session...
          </p>
        )}
        <div className="narrow-container portal-choices">
          <section
            className="portal-choice"
            aria-labelledby="super-admin-choice"
          >
            <div className="choice-header">
              <span className="icon-well">
                <Crown aria-hidden="true" />
              </span>
              <span className="choice-number">01 / GOVERNANCE</span>
            </div>
            <h2 id="super-admin-choice">Super Admin</h2>
            <p>
              Guide the platform, manage administrators and oversee system-wide
              settings.
            </p>
            <ul className="choice-details">
              <li>
                <Users aria-hidden="true" />
                Platform administrators
              </li>
              <li>
                <SlidersHorizontal aria-hidden="true" />
                Configuration and governance
              </li>
            </ul>
            <Link
              to="/platform/login/super-admin"
              state={location.state}
              className="button button-primary button-large"
            >
              Super Admin Login
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
          <section className="portal-choice" aria-labelledby="admin-choice">
            <div className="choice-header">
              <span className="icon-well">
                <ShieldCheck aria-hidden="true" />
              </span>
              <span className="choice-number">02 / OPERATIONS</span>
            </div>
            <h2 id="admin-choice">Admin</h2>
            <p>
              Keep daily operations moving, support organizations and review
              platform activity.
            </p>
            <ul className="choice-details">
              <li>
                <Building2 aria-hidden="true" />
                Organizations and verification
              </li>
              <li>
                <CircleCheck aria-hidden="true" />
                Support and platform operations
              </li>
            </ul>
            <Link
              to="/platform/login/admin"
              state={location.state}
              className="button button-primary button-large"
            >
              Admin Login
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </div>
        <p className="access-note">
          Use the login assigned to your account. Privileged actions remain
          permission-controlled and audited.
        </p>
      </main>
      <footer className="public-footer">
        <div className="container">
          <span>Clyptus Software Solutions</span>
          <span>People. Organizations. Opportunity.</span>
        </div>
      </footer>
    </div>
  );
};
