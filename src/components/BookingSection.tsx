import React, { useState, useEffect } from 'react';
import { AuthUser, Booking, Room, RoomTimelineSlot, WaitlistEntry } from '../types';
import { apiRequest } from '../services/api';

interface BookingSectionProps {
  user: AuthUser | null;
  selectedRoomFromCatalog?: Room | null;
}

export const BookingSection: React.FC<BookingSectionProps> = ({ user, selectedRoomFromCatalog }) => {
  const [roomId, setRoomId] = useState('');
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<RoomTimelineSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<any | null>(null);

  // New reservation form state
  const [durationHours, setDurationHours] = useState(2);
  const [purpose, setPurpose] = useState('Sessão de Estudos em Grupo');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage(`Erro ao carregar reservas: ${e.message}`);
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
        setRoomStatus(sResp.data?.status || 'Unknown');
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

  const handleCreateBooking = async () => {
    if (!roomId) {
      setMessage('⚠️ Selecione uma sala primeiro.');
      return;
    }
    setLoading(true);
    setMessage(null);

    const now = new Date();
    // Default start in 5 minutes
    const start = new Date(now.getTime() + 5 * 60 * 1000);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    try {
      const resp = await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId,
          startsAtUtc: start.toISOString(),
          endsAtUtc: end.toISOString(),
          purpose,
        }),
      });

      if (resp.ok) {
        setMessage(`🎉 Reserva #${resp.data?.id?.substring(0, 8)} criada com sucesso! Código Check-in: ${resp.data?.checkInCode}`);
        loadUserData();
        checkRoomStatus();
      } else {
        setMessage(`❌ Falha: ${resp.data?.detail || resp.data?.message || 'Conflito de reserva'}`);
      }
    } catch (e: any) {
      setMessage(`❌ Erro: ${e.message}`);
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
        body: JSON.stringify({
          checkInCode: booking.checkInCode || '123456',
        }),
      });

      if (resp.ok) {
        setMessage(`✅ Check-in realizado para a reserva #${booking.id.substring(0, 8)}! Evento disparado para SQS.`);
        loadUserData();
      } else {
        setMessage(`❌ Falha: ${resp.data?.detail || resp.data?.message || 'Erro no check-in'}`);
      }
    } catch (e: any) {
      setMessage(`❌ Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    setLoading(true);
    try {
      const resp = await apiRequest(`/api/bookings/${bookingId}/check-out`, { method: 'POST' });
      if (resp.ok) {
        setMessage(`🚪 Check-out realizado! Sala liberada.`);
        loadUserData();
      }
    } catch (e: any) {
      setMessage(`❌ Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    const reason = prompt('Motivo do cancelamento:') || 'Cancelamento voluntário pelo aluno';
    setLoading(true);
    try {
      const resp = await apiRequest(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (resp.ok) {
        setMessage(`🗑️ Reserva cancelada. Vagas na fila de espera notificadas.`);
        loadUserData();
      }
    } catch (e: any) {
      setMessage(`❌ Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!roomId) return;
    setLoading(true);
    const now = new Date();
    const start = new Date(now.getTime() + 10 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    try {
      const resp = await apiRequest('/api/bookings/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          roomId,
          startsAtUtc: start.toISOString(),
          endsAtUtc: end.toISOString(),
        }),
      });

      if (resp.ok) {
        setMessage('📋 Inserido na fila de espera (Waitlist) com sucesso!');
        loadUserData();
      }
    } catch (e: any) {
      setMessage(`❌ Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchReport = async () => {
    try {
      const resp = await apiRequest('/api/bookings/reports/occupancy');
      if (resp.ok) setOccupancyReport(resp.data);
    } catch (e: any) {
      setMessage(`Erro ao carregar relatório: ${e.message}`);
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div>
          <h2>📅 Motor de Reservas e Conflitos (Studium-Booking — 3 Réplicas)</h2>
          <p className="section-desc">Ciclo de vida de reservas, prevenção GiST contra double-booking, check-in por QR Code e fila de espera.</p>
        </div>
        <button onClick={loadUserData} disabled={loading} className="btn-secondary btn-sm">
          🔄 Atualizar Reservas
        </button>
      </div>

      {message && <div className="status-banner">{message}</div>}

      <div className="catalog-grid">
        {/* Reservation Creation Box */}
        <div className="sub-card">
          <h3>Nova Reserva / Consulta de Sala</h3>
          <div className="form-group">
            <label>ID da Sala (UUID):</label>
            <div className="input-with-button">
              <input
                type="text"
                placeholder="Ex: d8b2c45e-..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="input-field"
              />
              <button onClick={() => checkRoomStatus()} className="btn-secondary btn-sm">
                🔍 Consultar Status
              </button>
            </div>
          </div>

          {roomStatus && (
            <div className="room-status-badge-box">
              Status Atual: <span className="badge-highlight">{roomStatus}</span>
            </div>
          )}

          <div className="form-row">
            <label>
              Duração:
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(parseInt(e.target.value))}
                className="select-field"
              >
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={4}>4 horas</option>
              </select>
            </label>
            <label>
              Finalidade:
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="input-field"
              />
            </label>
          </div>

          <div className="button-group-row">
            <button
              onClick={handleCreateBooking}
              disabled={loading || !roomId}
              className="btn-primary"
            >
              📅 Confirmar Reserva
            </button>
            <button
              onClick={handleJoinWaitlist}
              disabled={loading || !roomId}
              className="btn-warning btn-sm"
            >
              📋 Entrar na Fila de Espera
            </button>
            <button
              onClick={handleFetchReport}
              className="btn-secondary btn-sm"
            >
              📊 Relatório Ocupação
            </button>
          </div>

          {/* Occupancy Report Viewer */}
          {occupancyReport && (
            <div className="occupancy-report-box">
              <h4>📊 Métricas de Ocupação da Instituição:</h4>
              <p>Total de Reservas: <strong>{occupancyReport.totalBookings}</strong></p>
              <p>Taxa de Check-in: <strong>{(occupancyReport.checkInRate * 100).toFixed(1)}%</strong></p>
              <p>Taxa de No-Show: <strong>{(occupancyReport.noShowRate * 100).toFixed(1)}%</strong></p>
              <p>Total Horas Reservadas: <strong>{occupancyReport.totalBookedHours?.toFixed(1)}h</strong></p>
            </div>
          )}
        </div>

        {/* My Active Bookings */}
        <div className="sub-card">
          <h3>Minhas Reservas Ativas ({bookings.length})</h3>
          <div className="bookings-scroll-list">
            {bookings.length > 0 ? (
              bookings.map((b) => (
                <div key={b.id} className="booking-item-row">
                  <div>
                    <strong>Reserva #{b.id.substring(0, 8)}</strong>
                    <span className={`status-pill pill-${b.status?.toLowerCase()}`}>
                      {b.status}
                    </span>
                    <div className="booking-meta">
                      Início: {new Date(b.startsAtUtc).toLocaleTimeString()} | Término: {new Date(b.endsAtUtc).toLocaleTimeString()}
                    </div>
                    {b.checkInCode && (
                      <div className="checkin-code-text">
                        Código QR / Check-in: <code>{b.checkInCode}</code>
                      </div>
                    )}
                  </div>

                  <div className="booking-action-buttons">
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
              <p className="empty-state-text">Nenhuma reserva ativa encontrada. Selecione uma sala para reservar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
