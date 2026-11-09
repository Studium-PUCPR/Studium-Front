import React, { useState } from 'react';
import { AuthUser, UserRole } from '../types';
import { DEMO_CREDENTIALS, loginWithCognito, logoutUser } from '../services/cognito';

interface AuthBarProps {
  user: AuthUser | null;
  onUserChange: (user: AuthUser | null) => void;
}

export const AuthBar: React.FC<AuthBarProps> = ({ user, onUserChange }) => {
  const [loading, setLoading] = useState(false);
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualPass, setManualPass] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleQuickLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      const creds = DEMO_CREDENTIALS[role];
      const loggedUser = await loginWithCognito(creds.email, creds.pass);
      onUserChange(loggedUser);
    } catch (e: any) {
      setError(e.message || 'Falha ao autenticar com Cognito.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail || !manualPass) return;
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await loginWithCognito(manualEmail, manualPass);
      onUserChange(loggedUser);
      setShowManualLogin(false);
    } catch (e: any) {
      setError(e.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    onUserChange(null);
  };

  return (
    <div className="auth-header-card">
      <div className="auth-header-top">
        <div className="brand-info">
          <span className="brand-icon">🏛️</span>
          <div>
            <h1 className="brand-title">Studium Cloud Platform</h1>
            <p className="brand-subtitle">Portal de Testes e Demonstração Operacional (EKS + Cognito)</p>
          </div>
        </div>

        <div className="auth-actions">
          {user ? (
            <div className="user-logged-box">
              <span className={`badge-role badge-${user.role.toLowerCase()}`}>
                {user.role === 'Administrator' ? '🛡️ Admin' : user.role === 'Professor' ? '👩‍🏫 Docente' : '🎓 Aluno'}
              </span>
              <div className="user-details">
                <strong>{user.name}</strong>
                <span className="user-email">{user.email}</span>
                {user.registrationNumber && (
                  <span className="user-reg">Matrícula: {user.registrationNumber}</span>
                )}
              </div>
              <button onClick={handleLogout} className="btn-secondary btn-sm">
                Desconectar
              </button>
            </div>
          ) : (
            <div className="quick-login-row">
              <span className="login-prompt">Login Rápido (Cognito):</span>
              <button
                onClick={() => handleQuickLogin('Student')}
                disabled={loading}
                className="btn-quick-login btn-student"
              >
                🎓 Aluno
              </button>
              <button
                onClick={() => handleQuickLogin('Professor')}
                disabled={loading}
                className="btn-quick-login btn-professor"
              >
                👩‍🏫 Docente
              </button>
              <button
                onClick={() => handleQuickLogin('Administrator')}
                disabled={loading}
                className="btn-quick-login btn-admin"
              >
                🛡️ Admin
              </button>
              <button
                onClick={() => setShowManualLogin(!showManualLogin)}
                className="btn-link"
              >
                {showManualLogin ? 'Fechar' : 'Entrar com Email...'}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert-error">⚠️ {error}</div>}

      {showManualLogin && !user && (
        <form onSubmit={handleManualLogin} className="manual-login-form">
          <input
            type="email"
            placeholder="Email institucional"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            required
            className="input-field"
          />
          <input
            type="password"
            placeholder="Senha Cognito"
            value={manualPass}
            onChange={(e) => setManualPass(e.target.value)}
            required
            className="input-field"
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>
      )}
    </div>
  );
};
