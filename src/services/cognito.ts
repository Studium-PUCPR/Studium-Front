import { AuthUser, UserRole } from '../types';

export const COGNITO_CONFIG = {
  region: 'us-east-2',
  userPoolId: 'us-east-2_ZyiCXOSCG',
  clientId: '27ut9a3j3bovljl13e4oobg2bc',
  endpoint: 'https://cognito-idp.us-east-2.amazonaws.com',
};

// Pre-seeded demo credentials for instant 1-click testing
export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; label: string }> = {
  Student: {
    email: 'estudante@pucpr.edu.br',
    pass: 'StudiumPassword2026!',
    label: '🎓 Estudante (Carlos Aluno)',
  },
  Professor: {
    email: 'professor@pucpr.edu.br',
    pass: 'StudiumPassword2026!',
    label: '👩‍🏫 Professora (Dra. Mariana)',
  },
  Administrator: {
    email: 'admin@pucpr.edu.br',
    pass: 'StudiumPassword2026!',
    label: '🛡️ Administrador (Roberto)',
  },
};

function parseJwt(token: string): Record<string, any> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT token', e);
    return {};
  }
}

export async function loginWithCognito(email: string, pass: string): Promise<AuthUser> {
  const response = await fetch(COGNITO_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CONFIG.clientId,
      AuthParameters: {
        USERNAME: email.trim(),
        PASSWORD: pass,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.__type ? `${data.__type}: ${data.message}` : data.message || 'Login failed';
    throw new Error(errorMsg);
  }

  const authResult = data.AuthenticationResult;
  if (!authResult || !authResult.IdToken) {
    throw new Error('Authentication challenge received or missing tokens in response');
  }

  const idToken = authResult.IdToken;
  const accessToken = authResult.AccessToken;
  const claims = parseJwt(idToken);

  const groups: string[] = claims['cognito:groups'] || [];
  let role: UserRole = 'Student';
  if (groups.includes('Administrator')) {
    role = 'Administrator';
  } else if (groups.includes('Professor')) {
    role = 'Professor';
  }

  const user: AuthUser = {
    email: claims.email || email,
    name: claims.name || claims['cognito:username'] || email,
    role,
    sub: claims.sub || '',
    registrationNumber: claims['custom:registration_number'],
    idToken,
    accessToken,
    expiresAt: (claims.exp || 0) * 1000,
  };

  localStorage.setItem('studium_auth_user', JSON.stringify(user));
  return user;
}

export function getStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem('studium_auth_user');
    if (!stored) return null;
    const user: AuthUser = JSON.parse(stored);
    if (Date.now() > user.expiresAt) {
      localStorage.removeItem('studium_auth_user');
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function logoutUser(): void {
  localStorage.removeItem('studium_auth_user');
}
