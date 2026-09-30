import { useState } from 'react';
import { ArrowRight, Layers3, Check } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { api, json } from '../lib/api';
import { errorMessage } from '../lib/format';
import { loginSchema, registerSchema } from '../../shared/validation';
import { useAuth } from '../hooks/useAuth';
import { ErrorNotice, Loading } from '../components/ui';
export function AuthPage() {
  const { user, refresh, loading, error: connectionError } = useAuth();
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  async function submit(data: unknown, demo = false) {
    setError('');
    setBusy(true);
    try {
      const schema = register && !demo ? registerSchema : loginSchema;
      const parsed = schema.safeParse(data);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await api(`/auth/${register && !demo ? 'register' : 'login'}`, json('POST', parsed.data));
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Layers3 size={23} />
          </span>
          OpsBoard<span className="brand-dot">.</span>
        </a>
        <div>
          <span className="eyebrow">LESS FRICTION. MORE FORWARD.</span>
          <h1>
            Good work starts
            <br />
            with a clear picture.
          </h1>
          <p>
            A shared home for your projects, people, and the little things that move your business
            forward.
          </p>
          <div className="auth-features">
            <span>
              <Check size={18} /> Your team's priorities, in one place
            </span>
            <span>
              <Check size={18} /> From first idea to finished work
            </span>
            <span>
              <Check size={18} /> A little more clarity, every day
            </span>
          </div>
        </div>
        <span className="auth-foot">Built for teams that care about how they work.</span>
        <div className="story-grid" aria-hidden="true" />
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <span className="eyebrow">YOUR WORKSPACE AWAITS</span>
          <h2>{register ? 'Make room for great work.' : 'Welcome back.'}</h2>
          <p>
            {register
              ? 'Create an account to set up or join your team.'
              : 'Sign in and pick up where your team left off.'}
          </p>
          <ErrorNotice message={error || connectionError} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void submit(Object.fromEntries(form));
            }}
          >
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 10 : 1}
                maxLength={72}
                placeholder={register ? 'At least 10 characters' : 'Enter your password'}
              />
            </label>
            <button className="button primary wide" disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="divider">
            <span>or take a look around</span>
          </div>
          <button
            disabled={busy}
            className="button wide"
            onClick={() =>
              void submit({ email: 'demo@opsboard.app', password: 'OpsBoardDemo!2026' }, true)
            }
          >
            Explore the demo workspace <ArrowRight size={17} />
          </button>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to OpsBoard?'}{' '}
            <button
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <p className="demo-note">The demo is a shared workspace with sample company data.</p>
        </div>
      </section>
    </div>
  );
}
