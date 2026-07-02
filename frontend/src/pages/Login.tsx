import type { FormEvent } from 'react';

interface LoginProps {
  authMode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  email: string;
  password: string;
  name: string;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export function Login({ authMode, onModeChange, email, password, name, error, onEmailChange, onPasswordChange, onNameChange, onSubmit }: LoginProps) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="brand-mark large">S</div>
          <div>
            <h2>Distributed Job Scheduler</h2>
            <p>Operations dashboard and workforce console</p>
          </div>
        </div>

        <div className="auth-toggle">
          <button type="button" className={`button ${authMode === 'login' ? 'button-primary' : 'button-secondary'}`} onClick={() => onModeChange('login')}>Sign in</button>
          <button type="button" className={`button ${authMode === 'register' ? 'button-primary' : 'button-secondary'}`} onClick={() => onModeChange('register')}>Register</button>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
          {authMode === 'register' ? <input className="input" placeholder="Full name" value={name} onChange={(event) => onNameChange(event.target.value)} /> : null}
          <input className="input" placeholder="Email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(event) => onPasswordChange(event.target.value)} />
          <button type="submit" className="button button-primary">{authMode === 'login' ? 'Continue' : 'Create account'}</button>
        </form>

        {error ? <div className="inline-error">{error}</div> : null}
      </div>
    </div>
  );
}
