import React, { useState, useEffect } from 'react';
import { AuthUser, NotificationItem } from '../types';
import { apiRequest } from '../services/api';

interface NotificationsSectionProps {
  user: AuthUser | null;
}

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test notification creation state
  const [testType, setTestType] = useState('SYSTEM_ALERT');
  const [testTitle, setTestTitle] = useState('Aviso do Sistema');
  const [testMessage, setTestMessage] = useState('Demonstração de notificação persistida no DynamoDB!');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  async function loadNotifications() {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{
        user_id: string;
        total_count: number;
        unread_count: number;
        items: NotificationItem[];
      }>(`/api/notifications?user_id=${user.sub}&limit=50`);

      if (res.ok && res.data) {
        const nList = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data)
          ? res.data
          : [];
        setNotifications(nList);
        setUnreadCount(res.data.unread_count || 0);
      } else {
        setNotifications([]);
        setErrorMsg(`Erro ao carregar notificações (${res.status})`);
      }
    } catch (err: any) {
      setErrorMsg(`Erro de conexão: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      const res = await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao marcar como lida: ${err.message}`);
    }
  }

  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSendingTest(true);
    setTestSuccess(null);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/api/notifications/test', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.sub,
          type: testType,
          title: testTitle,
          message: testMessage,
          data: {
            source: 'studium-front-demo',
            timestampUtc: new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        setTestSuccess('Notificação de teste gravada com sucesso no Amazon DynamoDB!');
        loadNotifications();
      } else {
        setErrorMsg(`Erro ao criar notificação de teste (${res.status})`);
      }
    } catch (err: any) {
      setErrorMsg(`Erro: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  }

  if (!user) {
    return (
      <div className="section-card">
        <h3>🔔 Central de Notificações</h3>
        <p className="hint">Faça login com um usuário para visualizar a caixa de notificações e alertas.</p>
      </div>
    );
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'RESERVATION_CONFIRMED':
        return 'badge-success';
      case 'RESERVATION_CANCELLED':
      case 'RESERVATION_NO_SHOW':
        return 'badge-danger';
      case 'WAITLIST_PROMOTED':
        return 'badge-warning';
      case 'ROOM_MAINTENANCE':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="notifications-section">
      <div className="section-card">
        <div className="card-header">
          <div>
            <h3>
              🔔 Minhas Notificações{' '}
              {unreadCount > 0 && <span className="badge badge-danger">{unreadCount} não lidas</span>}
            </h3>
            <p className="hint">
              Microserviço <code>Studium-Notifications</code> (Python 3.12 + FastAPI + Amazon DynamoDB + SQS Consumer)
            </p>
          </div>
          <button className="btn-secondary btn-sm" onClick={loadNotifications} disabled={loading}>
            {loading ? 'Atualizando...' : 'Recarregar'}
          </button>
        </div>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
        {testSuccess && <div className="alert alert-success">{testSuccess}</div>}

        {/* Notifications Feed */}
        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <p>📭 Nenhuma notificação encontrada para este usuário.</p>
              <p className="text-muted text-xs">
                Notificações são geradas automaticamente por eventos assíncronos do Wolverine via SQS ou pelo formulário abaixo.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.notification_id}
                className={`notification-item ${n.is_read ? 'notification-read' : 'notification-unread'}`}
              >
                <div className="notification-header">
                  <div className="notification-title-row">
                    <span className={`badge ${getTypeBadgeClass(n.type)}`}>{n.type}</span>
                    <strong className="notification-title">{n.title}</strong>
                  </div>
                  <span className="notification-time text-xs text-muted">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                  </span>
                </div>
                <p className="notification-body">{n.message}</p>
                {n.data && Object.keys(n.data).length > 0 && (
                  <pre className="notification-data-preview">
                    {JSON.stringify(n.data, null, 2)}
                  </pre>
                )}
                <div className="notification-actions">
                  {!n.is_read ? (
                    <button
                      className="btn-secondary btn-xs"
                      onClick={() => handleMarkAsRead(n.notification_id)}
                    >
                      Marcar como Lida
                    </button>
                  ) : (
                    <span className="text-xs text-muted">✓ Lida</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Test Notification Simulator */}
        <div className="card-subpanel mt-4">
          <h4>🧪 Simular / Disparar Notificação Direta (POST /api/notifications/test)</h4>
          <p className="text-xs text-muted">
            Permite testar a escrita na tabela DynamoDB <code>studium_notifications</code> sem depender do gatilho SQS.
          </p>
          <form onSubmit={handleCreateTest} className="test-notification-form">
            <div className="form-row">
              <label>
                Tipo:
                <select value={testType} onChange={(e) => setTestType(e.target.value)}>
                  <option value="SYSTEM_ALERT">SYSTEM_ALERT (Aviso do Sistema)</option>
                  <option value="RESERVATION_CONFIRMED">RESERVATION_CONFIRMED (Reserva Confirmada)</option>
                  <option value="RESERVATION_CANCELLED">RESERVATION_CANCELLED (Cancelamento)</option>
                  <option value="WAITLIST_PROMOTED">WAITLIST_PROMOTED (Vaga Disponível)</option>
                  <option value="ROOM_MAINTENANCE">ROOM_MAINTENANCE (Manutenção de Sala)</option>
                </select>
              </label>
              <label>
                Título:
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Título da notificação"
                  required
                />
              </label>
            </div>
            <div className="form-group">
              <label>Mensagem:</label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={2}
                required
              />
            </div>
            <button type="submit" className="btn-primary btn-sm" disabled={sendingTest}>
              {sendingTest ? 'Enviando...' : 'Gravar no DynamoDB'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
