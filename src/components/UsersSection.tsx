import React, { useState, useEffect } from 'react';
import { AuthUser, UserProfile } from '../types';
import { apiRequest } from '../services/api';

interface UsersSectionProps {
  user: AuthUser | null;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  actorId: string;
  action: string;
  reason?: string;
  createdAtUtc: string;
}

export const UsersSection: React.FC<UsersSectionProps> = ({ user }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyConfirmations, setNotifyConfirmations] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Admin users list state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [blockedFilter, setBlockedFilter] = useState('');
  const [adminMsg, setAdminMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Block modal state
  const [blockUserId, setBlockUserId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('Excessive no-shows in 30-day window');

  // Audit logs modal
  const [auditUserId, setAuditUserId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      if (user.role === 'Administrator') {
        loadUsersList();
      }
    } else {
      setProfile(null);
      setUsersList([]);
    }
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    setLoadingProfile(true);
    setProfileMsg(null);
    try {
      const res = await apiRequest<UserProfile>(`/api/users/${user.sub}`);
      if (res.ok && res.data) {
        setProfile(res.data);
        setPhone(res.data.phoneNumber || '');
        setNotifyReminders(res.data.notifyReminders ?? true);
        setNotifyConfirmations(res.data.notifyConfirmations ?? true);
      } else {
        setProfileMsg({ text: `Falha ao carregar perfil (${res.status})`, isError: true });
      }
    } catch (err: any) {
      setProfileMsg({ text: `Erro: ${err.message}`, isError: true });
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await apiRequest<UserProfile>(`/api/users/${user.sub}`, {
        method: 'PUT',
        body: JSON.stringify({
          phoneNumber: phone,
          notifyReminders,
          notifyConfirmations,
        }),
      });
      if (res.ok && res.data) {
        setProfile(res.data);
        setProfileMsg({ text: 'Perfil atualizado com sucesso!' });
      } else {
        setProfileMsg({ text: `Erro ao salvar perfil (${res.status})`, isError: true });
      }
    } catch (err: any) {
      setProfileMsg({ text: `Erro: ${err.message}`, isError: true });
    } finally {
      setSavingProfile(false);
    }
  }

  async function loadUsersList() {
    setLoadingUsers(true);
    setAdminMsg(null);
    try {
      let query = '/api/users?page=1&pageSize=50';
      if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;
      if (roleFilter) query += `&role=${encodeURIComponent(roleFilter)}`;
      if (blockedFilter !== '') query += `&isBlocked=${blockedFilter}`;

      const res = await apiRequest<{ items: any[]; totalCount: number }>(query);
      if (res.ok && res.data) {
        setUsersList(res.data.items || []);
      } else {
        setAdminMsg({ text: `Erro ao listar usuários (${res.status})`, isError: true });
      }
    } catch (err: any) {
      setAdminMsg({ text: `Erro: ${err.message}`, isError: true });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleToggleBlock(userId: string, isCurrentlyBlocked: boolean) {
    setAdminMsg(null);
    try {
      const res = await apiRequest(`/api/users/${userId}/block`, {
        method: 'PATCH',
        body: JSON.stringify({
          reason: isCurrentlyBlocked ? undefined : blockReason,
        }),
      });
      if (res.ok) {
        setAdminMsg({
          text: `Usuário ${isCurrentlyBlocked ? 'desbloqueado' : 'bloqueado'} com sucesso! Evento publicado via SQS.`,
        });
        setBlockUserId(null);
        loadUsersList();
        if (user && userId === user.sub) {
          loadProfile();
        }
      } else {
        setAdminMsg({ text: `Erro ao alterar status do usuário (${res.status})`, isError: true });
      }
    } catch (err: any) {
      setAdminMsg({ text: `Erro: ${err.message}`, isError: true });
    }
  }

  async function handleViewAuditLogs(userId: string) {
    setAuditUserId(userId);
    setLoadingAudit(true);
    try {
      const res = await apiRequest<AuditLogEntry[]>(`/api/users/${userId}/audit-logs`);
      if (res.ok && res.data) {
        setAuditLogs(res.data);
      } else {
        setAuditLogs([]);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  }

  if (!user) {
    return (
      <div className="section-card">
        <h3>👤 Meu Perfil & Gestão de Usuários</h3>
        <p className="hint">Faça login com um dos usuários acima para visualizar perfil e permissões.</p>
      </div>
    );
  }

  return (
    <div className="users-section">
      {/* User Profile Card */}
      <div className="section-card">
        <div className="card-header">
          <h3>👤 Meu Perfil ({user.role})</h3>
          <button className="btn-secondary btn-sm" onClick={loadProfile} disabled={loadingProfile}>
            {loadingProfile ? 'Carregando...' : 'Atualizar Dados'}
          </button>
        </div>

        {profileMsg && (
          <div className={`alert ${profileMsg.isError ? 'alert-error' : 'alert-success'}`}>
            {profileMsg.text}
          </div>
        )}

        {profile && (
          <div className="profile-grid">
            <div className="profile-field">
              <span className="field-label">Nome:</span>
              <span className="field-value font-bold">{profile.fullName}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Email:</span>
              <span className="field-value">{profile.email}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">ID / Matrícula:</span>
              <span className="field-value font-mono">{profile.registrationNumber || profile.id}</span>
            </div>
            <div className="profile-field">
              <span className="field-label">Status da Conta:</span>
              <span className={`badge ${profile.isBlocked ? 'badge-danger' : 'badge-success'}`}>
                {profile.isBlocked ? `BLOQUEADO: ${profile.blockReason || 'Sem motivo'}` : 'ATIVO'}
              </span>
            </div>

            <div className="stats-box">
              <div className="stat-item">
                <span className="stat-num">{profile.totalReservations30Days || 0}</span>
                <span className="stat-desc">Reservas (30d)</span>
              </div>
              <div className="stat-item">
                <span className="stat-num">{profile.completedReservations30Days || 0}</span>
                <span className="stat-desc">Concluídas</span>
              </div>
              <div className="stat-item">
                <span className="stat-num">{profile.cancelledReservations30Days || 0}</span>
                <span className="stat-desc">Canceladas</span>
              </div>
              <div className="stat-item danger-stat">
                <span className="stat-num">{profile.noShowCount30Days || 0}</span>
                <span className="stat-desc">No-Shows (30d)</span>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="profile-form">
              <h4>Preferências de Contato & Notificações (PUT /api/users/{user.sub})</h4>
              <div className="form-row">
                <label>
                  Telefone:
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 41 99999-9999"
                  />
                </label>
              </div>
              <div className="form-checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={notifyReminders}
                    onChange={(e) => setNotifyReminders(e.target.checked)}
                  />
                  Receber lembretes de reserva
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={notifyConfirmations}
                    onChange={(e) => setNotifyConfirmations(e.target.checked)}
                  />
                  Receber confirmações de reserva
                </label>
              </div>
              <button type="submit" className="btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Salvando...' : 'Salvar Preferências'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Admin User Management */}
      {user.role === 'Administrator' && (
        <div className="section-card mt-4">
          <div className="card-header">
            <div>
              <h3>🛡️ Gestão de Usuários (Administrador)</h3>
              <p className="hint">Consulte status, no-shows e aplique suspensões com sincronização distribuída SQS</p>
            </div>
            <button className="btn-secondary btn-sm" onClick={loadUsersList} disabled={loadingUsers}>
              {loadingUsers ? 'Pesquisando...' : 'Recarregar Usuários'}
            </button>
          </div>

          {adminMsg && (
            <div className={`alert ${adminMsg.isError ? 'alert-error' : 'alert-success'}`}>
              {adminMsg.text}
            </div>
          )}

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Buscar por nome, email ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Todos os Papéis</option>
              <option value="Student">Estudante (Student)</option>
              <option value="Professor">Professor</option>
              <option value="Administrator">Administrador</option>
            </select>
            <select value={blockedFilter} onChange={(e) => setBlockedFilter(e.target.value)}>
              <option value="">Todos os Status</option>
              <option value="false">Apenas Ativos</option>
              <option value="true">Apenas Bloqueados</option>
            </select>
            <button className="btn-primary btn-sm" onClick={loadUsersList}>
              Filtrar
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome & Email</th>
                  <th>Matrícula</th>
                  <th>Papel</th>
                  <th>No-Shows (30d)</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      {loadingUsers ? 'Carregando usuários...' : 'Nenhum usuário encontrado.'}
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.fullName}</strong>
                        <div className="text-muted text-xs">{u.email}</div>
                      </td>
                      <td className="font-mono">{u.registrationNumber || '-'}</td>
                      <td>
                        <span className="badge badge-info">{u.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.noShowCount30Days > 0 ? 'badge-danger' : 'badge-secondary'}`}>
                          {u.noShowCount30Days} faltas
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.isBlocked ? 'badge-danger' : 'badge-success'}`}>
                          {u.isBlocked ? 'BLOQUEADO' : 'ATIVO'}
                        </span>
                        {u.blockReason && <div className="text-xs text-muted mt-1">{u.blockReason}</div>}
                      </td>
                      <td>
                        <div className="actions-cell">
                          {u.isBlocked ? (
                            <button
                              className="btn-success btn-xs"
                              onClick={() => handleToggleBlock(u.id, true)}
                            >
                              Desbloquear
                            </button>
                          ) : (
                            <button
                              className="btn-danger btn-xs"
                              onClick={() => setBlockUserId(u.id)}
                            >
                              Bloquear
                            </button>
                          )}
                          <button
                            className="btn-secondary btn-xs"
                            onClick={() => handleViewAuditLogs(u.id)}
                          >
                            Auditoria
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Block Confirmation Modal / Inline Form */}
          {blockUserId && (
            <div className="modal-inline">
              <h4>⚠️ Confirmar Bloqueio de Usuário ({blockUserId})</h4>
              <p className="text-sm text-muted">
                O usuário perderá permissão para novas reservas. O evento <code>UserStatusChangedEvent</code> será publicado no SQS para o Studium-Booking.
              </p>
              <div className="form-group">
                <label>Motivo do Bloqueio:</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="full-width"
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn-danger btn-sm"
                  onClick={() => handleToggleBlock(blockUserId, false)}
                >
                  Confirmar Bloqueio
                </button>
                <button className="btn-secondary btn-sm" onClick={() => setBlockUserId(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Audit Logs Modal / Inline Box */}
          {auditUserId && (
            <div className="modal-inline">
              <div className="card-header">
                <h4>📜 Histórico de Auditoria do Usuário ({auditUserId})</h4>
                <button className="btn-secondary btn-xs" onClick={() => setAuditUserId(null)}>
                  Fechar
                </button>
              </div>
              {loadingAudit ? (
                <p>Carregando logs...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-muted">Nenhum evento de auditoria registrado para este usuário.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data (UTC)</th>
                      <th>Ação</th>
                      <th>Ator (Quem fez)</th>
                      <th>Motivo / Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="text-xs">{new Date(log.createdAtUtc).toLocaleString()}</td>
                        <td>
                          <span className="badge badge-info">{log.action}</span>
                        </td>
                        <td className="font-mono text-xs">{log.actorId}</td>
                        <td>{log.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
