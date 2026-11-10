
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuildingColumns,
  faGraduationCap,
  faChalkboardUser,
  faShieldHalved,
  faRightToBracket,
  faRightFromBracket,
  faXmark,
  faTriangleExclamation,
  faEnvelope,
  faLock,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

import { AuthUser, UserRole } from '../types';
import {
  DEMO_CREDENTIALS,
  loginWithCognito,
  logoutUser,
} from '../services/cognito';

interface AuthBarProps {
  user: AuthUser | null;
  onUserChange: (user: AuthUser | null) => void;
}

export const AuthBar: React.FC<AuthBarProps> = ({
  user,
  onUserChange,
}) => {
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
      const loggedUser = await loginWithCognito(
        creds.email,
        creds.pass
      );
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
      const loggedUser = await loginWithCognito(
        manualEmail,
        manualPass
      );

      onUserChange(loggedUser);
      setShowManualLogin(false);
      setManualPass('');
    } catch (e: any) {
      setError(e.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    onUserChange(null);
    setShowManualLogin(false);
    setManualPass('');
    setError(null);
  };

  const roleIcon =
    user?.role === 'Administrator'
      ? faShieldHalved
      : user?.role === 'Professor'
        ? faChalkboardUser
        : faGraduationCap;

  const roleLabel =
    user?.role === 'Administrator'
      ? 'Administrador'
      : user?.role === 'Professor'
        ? 'Docente'
        : 'Aluno';

  return (
    <section className="auth-header-card">
      <div className="auth-header-top">

        {/* Identidade da plataforma */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <FontAwesomeIcon icon={faBuildingColumns} />
          </div>

          <div className="auth-brand-text">
            <span className="auth-eyebrow">
              AMBIENTE ACADÊMICO
            </span>

            <h1 className="brand-title">
              Studium Cloud Platform
            </h1>

            <p className="brand-subtitle">
              Portal de Testes e Demonstração Operacional
              (EKS + Cognito)
            </p>
          </div>
        </div>

        {/* Autenticação */}
        <div className="auth-actions">
          {user ? (
            <div className="user-logged-box">
              <span
                className={`badge-role badge-${user.role.toLowerCase()}`}
              >
                <FontAwesomeIcon icon={roleIcon} />
                {roleLabel}
              </span>

              <div className="user-details">
                <strong>{user.name}</strong>
                <span className="user-email">
                  {user.email}
                </span>

                {user.registrationNumber && (
                  <span className="user-reg">
                    Matrícula: {user.registrationNumber}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="btn-logout"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                Desconectar
              </button>
            </div>
          ) : (
            <div className="auth-login-area">
              <span className="login-prompt">
                Acesso rápido
                <span className="login-prompt-detail">
                  Autenticação Cognito
                </span>
              </span>

              <div className="quick-login-row">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('Student')}
                  disabled={loading}
                  className="btn-quick-login btn-student"
                >
                  <FontAwesomeIcon icon={faGraduationCap} />
                  Aluno
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('Professor')}
                  disabled={loading}
                  className="btn-quick-login btn-professor"
                >
                  <FontAwesomeIcon icon={faChalkboardUser} />
                  Docente
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('Administrator')}
                  disabled={loading}
                  className="btn-quick-login btn-admin"
                >
                  <FontAwesomeIcon icon={faShieldHalved} />
                  Admin
                </button>

                <span className="login-divider" aria-hidden="true" />

                <button
                  type="button"
                  onClick={() => {
                    setShowManualLogin(!showManualLogin);
                    setError(null);
                  }}
                  className="btn-email-login"
                  aria-expanded={showManualLogin}
                >
                  <FontAwesomeIcon
                    icon={
                      showManualLogin
                        ? faXmark
                        : faRightToBracket
                    }
                  />
                  {showManualLogin
                    ? 'Fechar login'
                    : 'Entrar com Email'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          <span>{error}</span>
        </div>
      )}

      {showManualLogin && !user && (
        <form
          onSubmit={handleManualLogin}
          className="manual-login-form"
        >
          <div className="manual-login-heading">
            <h3>Login institucional</h3>
            <p>Entre com suas credenciais do Cognito.</p>
          </div>

          <div className="manual-login-fields">
            <label className="auth-input-group">
              <FontAwesomeIcon icon={faEnvelope} />
              <input
                type="email"
                placeholder="Email institucional"
                value={manualEmail}
                onChange={(e) =>
                  setManualEmail(e.target.value)
                }
                required
                className="input-field"
                autoComplete="username"
              />
            </label>

            <label className="auth-input-group">
              <FontAwesomeIcon icon={faLock} />
              <input
                type="password"
                placeholder="Senha"
                value={manualPass}
                onChange={(e) =>
                  setManualPass(e.target.value)
                }
                required
                className="input-field"
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-auth-submit"
            >
              <FontAwesomeIcon
                icon={loading ? faSpinner : faRightToBracket}
                spin={loading}
              />
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
