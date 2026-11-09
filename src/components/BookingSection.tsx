import React, { useState, useEffect } from 'react';
import { Booking, Room, RoomTimelineSlot, WaitlistEntry, AuthUser } from '../types';
import { apiRequest } from '../services/api';

interface BookingSectionProps {
  user: AuthUser | null;
  selectedRoomFromCatalog?: Room | null;
}

export const BookingSection: React.FC<BookingSectionProps> = ({ user, selectedRoomFromCatalog }) => {
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>('');
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<RoomTimelineSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<any | null>(null);

  // Date and Time pickers (24h)
  const getInitialDate = () => {
    const d = new Date();
    if (d.getHours() >= 20) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getInitialDate());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState('Sessão de Estudos em Grupo');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const calculateDurationMinutes = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const currentDurationMinutes = calculateDurationMinutes(startTime, endTime);

  const validateDuration = (minutes: number, role?: string) => {
    if (minutes <= 0) {
      return { valid: false, message: 'Horário de término deve ser posterior ao horário de início.' };
    }
    if (minutes < 15) {
      return { valid: false, message: 'Duração mínima permitida: 15 minutos.' };
    }
    const maxMinutes = role === 'Professor' || role === 'Administrator' ? 300 : 120;
    const roleLimitDesc = role === 'Professor' ? '5 horas (Professor)' : role === 'Administrator' ? '5 horas (Admin)' : '2 horas (Estudante)';

    if (minutes > maxMinutes) {
      return {
        valid: false,
        message: `Limite excedido para ${roleLimitDesc}. Selecionado: ${Math.floor(minutes / 60)}h ${minutes % 60}m.`,
      };
    }

    return {
      valid: true,
      message: `Duração calculada: ${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : '00m'} (Permitido: máx ${roleLimitDesc})`,
    };
  };

  const durationValidation = validateDuration(currentDurationMinutes, user?.role);

  // Helper for strictly 24-hour time formatting (no AM/PM)
  const formatTime24h = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return isoString;
    }
  };

  const formatDateTime24h = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const datePart = d.toLocaleDateString('pt-BR');
      const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${datePart} às ${timePart}`;
    } catch {
      return isoString;
    }
  };

  // Load available rooms from Catalog for easy dropdown selection
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await apiRequest<any>('/api/catalog/rooms');
        if (res.ok && res.data) {
          const list = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data.items)
            ? res.data.items
            : [];
          setAvailableRooms(list);
          if (list.length > 0 && !roomId && !selectedRoomFromCatalog) {
            setRoomId(list[0].id);
            checkRoomStatus(list[0].id);
          }
        }
      } catch {
        // Ignored, user can still type room UUID manually
      }
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomFromCatalog) {
      setRoomId(selectedRoomFromCatalog.id);
      checkRoomStatus(selectedRoomFromCatalog.id);
    }
  }, [selectedRoomFromCatalog]);

  const loadUserData = async () => {
    if (!user) {
      setBookings([]);
      setWaitlist([]);
      return;
    }
    setLoading(true);
    try {
      const bResp = await apiRequest<any>('/api/bookings');
      if (bResp.ok && bResp.data) {
        const bList = Array.isArray(bResp.data)
          ? bResp.data
          : Array.isArray(bResp.data.items)
          ? bResp.data.items
          : [];
        setBookings(bList);
      } else {
        setBookings([]);
      }

      const wResp = await apiRequest<any>('/api/bookings/waitlist');
      if (wResp.ok && wResp.data) {
        const wList = Array.isArray(wResp.data)
          ? wResp.data
          : Array.isArray(wResp.data.items)
          ? wResp.data.items
          : [];
        setWaitlist(wList);
      } else {
        setWaitlist([]);
      }
    } catch (e: any) {
      setMessage({ text: `Erro ao carregar reservas: ${e.message}`, isError: true });
      setBookings([]);
      setWaitlist([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user]);

  const checkRoomStatus = async (targetRoomId?: string) => {
    const id = targetRoomId || roomId;
    if (!id) return;
    try {
      const sResp = await apiRequest<any>(`/api/bookings/rooms/${id}/status`);
      if (sResp.ok && sResp.data) {
        setRoomStatus(sResp.data?.status || 'Available');
      }

      const tResp = await apiRequest<any>(`/api/bookings/rooms/${id}/timeline`);
      if (tResp.ok && tResp.data) {
        const tList = Array.isArray(tResp.data)
          ? tResp.data
          : Array.isArray(tResp.data.items)
          ? tResp.data.items
          : [];
        setTimeline(tList);
      } else {
        setTimeline([]);
      }
    } catch (e: any) {
      setRoomStatus(`Erro: ${e.message}`);
      setTimeline([]);
    }
  };

  const handleRoomChange = (newRoomId: string) => {
    setRoomId(newRoomId);
    checkRoomStatus(newRoomId);
  };

  const handleCreateBooking = async () => {
    if (!roomId) {
      setMessage({ text: '⚠️ Selecione uma sala primeiro.', isError: true });
      return;
    }
    if (!user) {
      setMessage({ text: '⚠️ Faça login com um usuário no topo antes de reservar.', isError: true });
      return;
    }
    if (!durationValidation.valid) {
      setMessage({ text: `⚠️ ${durationValidation.message}`, isError: true });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const startsAt = new Date(`${date}T${startTime}:00`);
      const endsAt = new Date(`${date}T${endTime}:00`);
      const selectedRoom = availableRooms.find((r) => r.id === roomId);
      const bookingTitle = selectedRoom ? `${selectedRoom.name} (${selectedRoom.code})` : `Reserva ${purpose}`;

      const resp = await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId,
          title: bookingTitle,
          startsAtUtc: startsAt.toISOString(),
          endsAtUtc: endsAt.toISOString(),
          purpose,
        }),
      });

      if (resp.ok) {
        setMessage({
          text: `🎉 Reserva #${resp.data?.id?.substring(0, 8)} criada com sucesso! Horário: ${startTime} às ${endTime} (24h). Código Check-in: ${resp.data?.checkInCode || 'N/A'}. Notificação enviada ao RabbitMQ.`,
          isError: false,
        });
        loadUserData();
        checkRoomStatus();
      } else {
        const errMsg = resp.data?.detail || resp.data?.title || resp.data?.message || 'Conflito de reserva';
        setMessage({ text: `❌ Falha: ${errMsg}`, isError: true });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Erro: ${e.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (booking: Booking) => {
    setLoading(true);
    setMessage(null);
    try {
      const resp = await apiRequest(`/api/bookings/${booking.id}/check-in`, {
        method: 'POST',
        body: JSON.stringify({ checkInCode: booking.checkInCode }),
      });
      if (resp.ok) {
        setMessage({ text: `✅ Check-in realizado com sucesso para a Reserva #${booking.id.substring(0, 8)}!`, isError: false });
        loadUserData();
        checkRoomStatus();
      } else {
        const errMsg = resp.data?.detail || resp.data?.message || 'Falha no check-in';
        setMessage({ text: `❌ Erro: ${errMsg}`, isError: true });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Erro: ${e.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const resp = await apiRequest(`/api/bookings/${bookingId}/check-out`, { method: 'POST' });
      if (resp.ok) {
        setMessage({ text: `🚪 Check-out realizado para a Reserva #${bookingId.substring(0, 8)}. Sala liberada!`, isError: false });
        loadUserData();
        checkRoomStatus();
      } else {
        const errMsg = resp.data?.detail || resp.data?.message || 'Falha no check-out';
        setMessage({ text: `❌ Erro: ${errMsg}`, isError: true });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Erro: ${e.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const resp = await apiRequest(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelado pelo usuário na interface' }),
      });
      if (resp.ok) {
        setMessage({ text: `🗑️ Reserva #${bookingId.substring(0, 8)} cancelada com sucesso! Vaga liberada para fila de espera.`, isError: false });
        loadUserData();
        checkRoomStatus();
      } else {
        const errMsg = resp.data?.detail || resp.data?.message || 'Falha ao cancelar';
        setMessage({ text: `❌ Erro: ${errMsg}`, isError: true });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Erro: ${e.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!roomId) return;
    if (!durationValidation.valid) {
      setMessage({ text: `⚠️ ${durationValidation.message}`, isError: true });
      return;
    }
    setLoading(true);
    setMessage(null);

    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);

    try {
      const resp = await apiRequest('/api/bookings/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          roomId,
          startsAtUtc: startsAt.toISOString(),
          endsAtUtc: endsAt.toISOString(),
        }),
      });

      if (resp.ok) {
        setMessage({ text: `📋 Você entrou na Fila de Espera para o horário! Notificação automática será disparada se houver cancelamento.`, isError: false });
        loadUserData();
      } else {
        const errMsg = resp.data?.detail || resp.data?.message || 'Falha ao entrar na fila';
        setMessage({ text: `❌ Falha: ${errMsg}`, isError: true });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Erro: ${e.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadOccupancy = async () => {
    try {
      const resp = await apiRequest('/api/bookings/reports/occupancy');
      if (resp.ok) {
        setOccupancyReport(resp.data);
      }
    } catch (e: any) {
      setMessage({ text: `Erro ao carregar relatório: ${e.message}`, isError: true });
    }
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  return (
    <div className="section-card">
      <div className="card-header">
        <div>
          <h3>📅 Motor de Reservas e Conflitos (Studium-Booking — 3 Réplicas EKS)</h3>
          <p className="hint">
            Prevenção de double-booking via <code>tstzrange</code> GiST no PostgreSQL, check-in por QR Code e fila de espera.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleLoadOccupancy} className="btn-secondary btn-sm">
            📊 Relatório Ocupação
          </button>
          <button onClick={loadUserData} disabled={loading} className="btn-secondary btn-sm">
            {loading ? 'Carregando...' : '🔄 Atualizar'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.isError ? 'alert-error' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      {occupancyReport && (
        <div className="stats-box" style={{ marginBottom: '16px' }}>
          <div className="stat-item">
            <span className="stat-num">{occupancyReport.totalBookings || 0}</span>
            <span className="stat-desc">Total Reservas</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{((occupancyReport.checkInRate || 0) * 100).toFixed(0)}%</span>
            <span className="stat-desc">Taxa Check-in</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{((occupancyReport.noShowRate || 0) * 100).toFixed(0)}%</span>
            <span className="stat-desc">Taxa No-Show</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{(occupancyReport.totalBookedHours || 0).toFixed(1)}h</span>
            <span className="stat-desc">Horas Alocadas</span>
          </div>
        </div>
      )}

      <div className="grid-cards" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        {/* Reservation Creation Box */}
        <div className="sub-card">
          <h4>Nova Reserva & Agendamento (24h)</h4>

          {/* Room Selector Dropdown */}
          <div className="form-group">
            <label>Selecionar Sala:</label>
            {availableRooms.length > 0 ? (
              <select
                value={roomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="full-width"
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code}) — Andar {r.floor}, Cap. {r.capacity}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="ID da Sala (UUID)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="full-width"
                />
                <button onClick={() => checkRoomStatus()} className="btn-secondary btn-sm">
                  🔍 Status
                </button>
              </div>
            )}
          </div>

          {roomStatus && (
            <div style={{ margin: '8px 0', fontSize: '0.85rem' }}>
              Status da Sala: <span className={`badge ${roomStatus === 'Available' ? 'badge-success' : 'badge-warning'}`}>{roomStatus}</span>
            </div>
          )}

          {/* Date and 24h Time pickers */}
          <div className="form-row">
            <label>
              Data:
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ marginLeft: '6px' }}
                required
              />
            </label>
            <label>
              Início (24h):
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ marginLeft: '6px', width: '105px' }}
                required
              />
            </label>
            <label>
              Término (24h):
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ marginLeft: '6px', width: '105px' }}
                required
              />
            </label>
          </div>

          {/* Dynamic Duration Validation Status */}
          <div style={{ margin: '8px 0', fontSize: '0.82rem' }}>
            <span className={`badge ${durationValidation.valid ? 'badge-success' : 'badge-danger'}`}>
              {durationValidation.message}
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label>Finalidade:</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="full-width"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={handleCreateBooking}
              disabled={loading || !roomId || !durationValidation.valid}
              className="btn-primary"
            >
              📅 Confirmar Reserva
            </button>
            <button
              onClick={handleJoinWaitlist}
              disabled={loading || !roomId || !durationValidation.valid}
              className="btn-warning btn-sm"
            >
              📋 Fila de Espera
            </button>
          </div>

          {/* Timeline Visualizer in 24h */}
          {safeTimeline.length > 0 && (
            <div className="card-subpanel mt-4">
              <strong className="text-xs">Grade de Horários da Sala (24h):</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {safeTimeline.slice(0, 5).map((slot, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 8px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <span>{formatTime24h(slot.startsAtUtc)} às {formatTime24h(slot.endsAtUtc)} (24h)</span>
                    <span className={`badge ${slot.status === 'Available' ? 'badge-success' : slot.status === 'Maintenance' ? 'badge-danger' : 'badge-warning'}`}>
                      {slot.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* My Active Bookings in 24h */}
        <div className="sub-card">
          <h4>Minhas Reservas Ativas ({safeBookings.length})</h4>
          <div className="bookings-scroll-list" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {safeBookings.length > 0 ? (
              safeBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#ffffff',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Reserva #{b.id.substring(0, 8)}</strong>
                    <span className={`badge ${b.status === 'Confirmed' ? 'badge-info' : b.status === 'CheckedIn' ? 'badge-success' : 'badge-secondary'}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="text-muted text-xs" style={{ margin: '6px 0' }}>
                    Horário: {formatDateTime24h(b.startsAtUtc)} até {formatTime24h(b.endsAtUtc)} (24h)
                  </div>
                  {b.checkInCode && (
                    <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '8px' }}>
                      Código de Check-in: <strong><code>{b.checkInCode}</code></strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {b.status === 'Confirmed' && (
                      <button
                        onClick={() => handleCheckIn(b)}
                        className="btn-success btn-xs"
                      >
                        Check-in ✅
                      </button>
                    )}
                    {b.status === 'CheckedIn' && (
                      <button
                        onClick={() => handleCheckOut(b.id)}
                        className="btn-secondary btn-xs"
                      >
                        Check-out 🚪
                      </button>
                    )}
                    {(b.status === 'Confirmed' || b.status === 'CheckedIn') && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="btn-danger btn-xs"
                      >
                        Cancelar 🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm" style={{ padding: '24px 0', textAlign: 'center' }}>
                Nenhuma reserva ativa encontrada para este usuário.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
