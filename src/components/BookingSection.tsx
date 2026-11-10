
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faCalendarPlus,
  faClock,
  faRotate,
  faChartColumn,
  faDoorOpen,
  faUsers,
  faLayerGroup,
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faSpinner,
  faListOl,
  faRightToBracket,
  faRightFromBracket,
  faTrashCan,
  faTicket,
  faShieldHalved,
  faArrowRight,
  faInbox,
  faChevronDown,
  faChartPie,
  faHourglassHalf,
  faClipboardCheck,
  faBuilding,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';

import {
  Booking,
  Room,
  RoomTimelineSlot,
  WaitlistEntry,
  AuthUser,
} from '../types';
import { apiRequest } from '../services/api';

interface BookingSectionProps {
  user: AuthUser | null;
  selectedRoomFromCatalog?: Room | null;
}

type Feedback = {
  text: string;
  isError?: boolean;
};

const getInitialDate = (): string => {
  const date = new Date();

  if (date.getHours() >= 20) {
    date.setDate(date.getDate() + 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatTime24h = (isoString: string): string => {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) return isoString;

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatDateTime24h = (isoString: string): string => {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) return isoString;

  return `${date.toLocaleDateString('pt-BR')} às ${formatTime24h(
    isoString
  )}`;
};

const calculateDurationMinutes = (
  start: string,
  end: string
): number => {
  if (!start || !end) return 0;

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
};

const normalizeStatus = (status?: string): string =>
  (status || 'Unknown').toLowerCase();

const getStatusLabel = (status?: string): string => {
  const labels: Record<string, string> = {
    confirmed: 'Confirmada',
    checkedin: 'Check-in realizado',
    checkedout: 'Finalizada',
    cancelled: 'Cancelada',
    canceled: 'Cancelada',
    pending: 'Pendente',
    available: 'Disponível',
    maintenance: 'Manutenção',
    occupied: 'Ocupada',
    unknown: 'Desconhecido',
  };

  return labels[normalizeStatus(status)] || status || 'Desconhecido';
};

const getStatusClass = (status?: string): string => {
  switch (normalizeStatus(status)) {
    case 'confirmed':
    case 'available':
      return 'success';

    case 'checkedin':
      return 'info';

    case 'checkedout':
      return 'neutral';

    case 'cancelled':
    case 'canceled':
      return 'danger';

    case 'maintenance':
    case 'occupied':
    case 'pending':
      return 'warning';

    default:
      return 'neutral';
  }
};

export const BookingSection: React.FC<BookingSectionProps> = ({
  user,
  selectedRoomFromCatalog,
}) => {
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<RoomTimelineSlot[]>([]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<any | null>(
    null
  );

  const [date, setDate] = useState(getInitialDate);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [purpose, setPurpose] = useState(
    'Sessão de Estudos em Grupo'
  );

  const [loading, setLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const [message, setMessage] = useState<Feedback | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const currentDurationMinutes = calculateDurationMinutes(
    startTime,
    endTime
  );

  const validateDuration = (
    minutes: number,
    role?: string
  ) => {
    if (minutes <= 0) {
      return {
        valid: false,
        message: 'O término deve ser posterior ao início.',
      };
    }

    if (minutes < 15) {
      return {
        valid: false,
        message: 'A duração mínima é de 15 minutos.',
      };
    }

    const maxMinutes =
      role === 'Professor' || role === 'Administrator' ? 300 : 120;

    const roleLabel =
      role === 'Professor'
        ? 'Professor'
        : role === 'Administrator'
          ? 'Administrador'
          : 'Estudante';

    if (minutes > maxMinutes) {
      return {
        valid: false,
        message: `Limite excedido: máximo de ${
          maxMinutes / 60
        } horas para ${roleLabel}.`,
      };
    }

    return {
      valid: true,
      message: `Duração: ${Math.floor(minutes / 60)}h ${String(
        minutes % 60
      ).padStart(2, '0')}min · Limite de ${
        maxMinutes / 60
      }h (${roleLabel})`,
    };
  };

  const durationValidation = validateDuration(
    currentDurationMinutes,
    user?.role
  );

  const checkRoomStatus = useCallback(
    async (targetRoomId: string) => {
      if (!targetRoomId) {
        setRoomStatus(null);
        setTimeline([]);
        return;
      }

      setRoomStatus(null);
      setTimeline([]);

      try {
        const statusResponse = await apiRequest<any>(
          `/api/bookings/rooms/${targetRoomId}/status`
        );

        if (statusResponse.ok && statusResponse.data) {
          setRoomStatus(
            statusResponse.data.status || 'Available'
          );
        }

        const timelineResponse = await apiRequest<any>(
          `/api/bookings/rooms/${targetRoomId}/timeline`
        );

        if (timelineResponse.ok && timelineResponse.data) {
          const data = timelineResponse.data;

          setTimeline(
            Array.isArray(data)
              ? data
              : Array.isArray(data.items)
                ? data.items
                : []
          );
        }
      } catch (error: any) {
        setRoomStatus(`Erro: ${error.message}`);
        setTimeline([]);
      }
    },
    []
  );

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);

    try {
      const response = await apiRequest<any>(
        '/api/catalog/rooms'
      );

      if (response.ok && response.data) {
        const data = response.data;

        const roomsList: Room[] = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : [];

        setAvailableRooms(roomsList);

        if (!selectedRoomFromCatalog && roomsList.length > 0) {
          setRoomId((previous) => previous || roomsList[0].id);
        }
      }
    } catch {
      // O campo UUID permanece disponível caso
      // o catálogo não responda.
    } finally {
      setRoomsLoading(false);
    }
  }, [selectedRoomFromCatalog]);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setWaitlist([]);
      return;
    }

    setLoading(true);

    try {
      const bookingsResponse = await apiRequest<any>(
        '/api/bookings'
      );

      if (bookingsResponse.ok && bookingsResponse.data) {
        const data = bookingsResponse.data;

        setBookings(
          Array.isArray(data)
            ? data
            : Array.isArray(data.items)
              ? data.items
              : []
        );
      } else {
        setBookings([]);
      }

      const waitlistResponse = await apiRequest<any>(
        '/api/bookings/waitlist'
      );

      if (waitlistResponse.ok && waitlistResponse.data) {
        const data = waitlistResponse.data;

        setWaitlist(
          Array.isArray(data)
            ? data
            : Array.isArray(data.items)
              ? data.items
              : []
        );
      } else {
        setWaitlist([]);
      }
    } catch (error: any) {
      setMessage({
        text: `Erro ao carregar reservas: ${error.message}`,
        isError: true,
      });

      setBookings([]);
      setWaitlist([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (selectedRoomFromCatalog) {
      setRoomId(selectedRoomFromCatalog.id);
    }
  }, [selectedRoomFromCatalog]);

  useEffect(() => {
    if (roomId) {
      checkRoomStatus(roomId);
    }
  }, [roomId, checkRoomStatus]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleRoomChange = (newRoomId: string) => {
    setRoomId(newRoomId);
    setMessage(null);
  };

  const refreshData = async () => {
    await Promise.all([
      loadUserData(),
      fetchRooms(),
      roomId ? checkRoomStatus(roomId) : Promise.resolve(),
    ]);
  };

  const handleCreateBooking = async () => {
    if (!roomId) {
      setMessage({
        text: 'Selecione uma sala antes de continuar.',
        isError: true,
      });
      return;
    }

    if (!user) {
      setMessage({
        text: 'Faça login antes de realizar uma reserva.',
        isError: true,
      });
      return;
    }

    if (!durationValidation.valid) {
      setMessage({
        text: durationValidation.message,
        isError: true,
      });
      return;
    }

    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime())
    ) {
      setMessage({
        text: 'Informe uma data e horários válidos.',
        isError: true,
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const selectedRoom = availableRooms.find(
        (room) => room.id === roomId
      );

      const bookingTitle = selectedRoom
        ? `${selectedRoom.name} (${selectedRoom.code})`
        : `Reserva ${purpose}`;

      const response = await apiRequest<any>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId,
          title: bookingTitle,
          startsAtUtc: startsAt.toISOString(),
          endsAtUtc: endsAt.toISOString(),
          purpose,
        }),
      });

      if (response.ok) {
        setMessage({
          text: `Reserva #${
            response.data?.id?.substring(0, 8) || 'criada'
          } confirmada! Horário: ${startTime} às ${endTime}. Código de check-in: ${
            response.data?.checkInCode || 'N/A'
          }.`,
        });

        await loadUserData();
        await checkRoomStatus(roomId);
      } else {
        const errorMessage =
          response.data?.detail ||
          response.data?.title ||
          response.data?.message ||
          'Conflito de reserva';

        setMessage({
          text: `Não foi possível criar a reserva: ${errorMessage}`,
          isError: true,
        });
      }
    } catch (error: any) {
      setMessage({
        text: `Erro ao reservar: ${error.message}`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (booking: Booking) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiRequest<any>(
        `/api/bookings/${booking.id}/check-in`,
        {
          method: 'POST',
          body: JSON.stringify({
            checkInCode: booking.checkInCode,
          }),
        }
      );

      if (response.ok) {
        setMessage({
          text: `Check-in realizado para a reserva #${booking.id.substring(
            0,
            8
          )}.`,
        });

        await loadUserData();
        await checkRoomStatus(roomId);
      } else {
        setMessage({
          text:
            response.data?.detail ||
            response.data?.message ||
            'Falha ao realizar check-in.',
          isError: true,
        });
      }
    } catch (error: any) {
      setMessage({
        text: `Erro: ${error.message}`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiRequest<any>(
        `/api/bookings/${bookingId}/check-out`,
        { method: 'POST' }
      );

      if (response.ok) {
        setMessage({
          text: `Check-out realizado. A sala foi liberada.`,
        });

        await loadUserData();
        await checkRoomStatus(roomId);
      } else {
        setMessage({
          text:
            response.data?.detail ||
            response.data?.message ||
            'Falha ao realizar check-out.',
          isError: true,
        });
      }
    } catch (error: any) {
      setMessage({
        text: `Erro: ${error.message}`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiRequest<any>(
        `/api/bookings/${bookingId}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: 'Cancelado pelo usuário na interface',
          }),
        }
      );

      if (response.ok) {
        setMessage({
          text: `Reserva #${bookingId.substring(
            0,
            8
          )} cancelada com sucesso.`,
        });

        await loadUserData();
        await checkRoomStatus(roomId);
      } else {
        setMessage({
          text:
            response.data?.detail ||
            response.data?.message ||
            'Falha ao cancelar reserva.',
          isError: true,
        });
      }
    } catch (error: any) {
      setMessage({
        text: `Erro: ${error.message}`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!roomId || !user) {
      setMessage({
        text: 'Faça login e selecione uma sala.',
        isError: true,
      });
      return;
    }

    if (!durationValidation.valid) {
      setMessage({
        text: durationValidation.message,
        isError: true,
      });
      return;
    }

    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime())
    ) {
      setMessage({
        text: 'Informe uma data e horários válidos.',
        isError: true,
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await apiRequest<any>(
        '/api/bookings/waitlist',
        {
          method: 'POST',
          body: JSON.stringify({
            roomId,
            startsAtUtc: startsAt.toISOString(),
            endsAtUtc: endsAt.toISOString(),
          }),
        }
      );

      if (response.ok) {
        setMessage({
          text:
            'Você entrou na fila de espera para o horário selecionado.',
        });

        await loadUserData();
      } else {
        setMessage({
          text:
            response.data?.detail ||
            response.data?.message ||
            'Falha ao entrar na fila de espera.',
          isError: true,
        });
      }
    } catch (error: any) {
      setMessage({
        text: `Erro: ${error.message}`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadOccupancy = async () => {
    setReportLoading(true);

    try {
      const response = await apiRequest<any>(
        '/api/bookings/reports/occupancy'
      );

      if (response.ok) {
        setOccupancyReport(response.data);
      } else {
        setMessage({
          text: 'Não foi possível carregar o relatório.',
          isError: true,
        });
      }
    } catch (error: any) {
      setMessage({
        text: `Erro ao carregar relatório: ${error.message}`,
        isError: true,
      });
    } finally {
      setReportLoading(false);
    }
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const safeWaitlist = Array.isArray(waitlist) ? waitlist : [];

  const activeBookings = safeBookings.filter((booking) =>
    ['confirmed', 'checkedin', 'pending'].includes(
      normalizeStatus(booking.status)
    )
  );

  const historyBookings = safeBookings.filter(
    (booking) =>
      !['confirmed', 'checkedin', 'pending'].includes(
        normalizeStatus(booking.status)
      )
  );

  const selectedRoom = availableRooms.find(
    (room) => room.id === roomId
  );

  const renderBookingCard = (booking: Booking) => (
    <article className="booking-item" key={booking.id}>
      <div className="booking-item-header">
        <div className="booking-item-identity">
          <div className="booking-item-icon">
            <FontAwesomeIcon icon={faCalendarDays} />
          </div>

          <div>
            <span className="booking-item-label">
              RESERVA
            </span>
            <h4>#{booking.id.substring(0, 8)}</h4>
          </div>
        </div>

        <span
          className={`booking-status booking-status-${getStatusClass(
            booking.status
          )}`}
        >
          <span className="booking-status-dot" />
          {getStatusLabel(booking.status)}
        </span>
      </div>

      <div className="booking-item-schedule">
        <FontAwesomeIcon icon={faClock} />
        <span>
          {formatDateTime24h(booking.startsAtUtc)}
          {' — '}
          {formatTime24h(booking.endsAtUtc)}
        </span>
      </div>

      {booking.checkInCode && (
        <div className="booking-checkin-code">
          <div>
            <FontAwesomeIcon icon={faTicket} />
            <span>Código de check-in</span>
          </div>

          <strong>{booking.checkInCode}</strong>
        </div>
      )}

      {(booking.status === 'Confirmed' ||
        booking.status === 'CheckedIn') && (
        <div className="booking-item-actions">
          {booking.status === 'Confirmed' && (
            <button
              type="button"
              className="btn-success btn-sm"
              disabled={loading}
              onClick={() => handleCheckIn(booking)}
            >
              <FontAwesomeIcon icon={faRightToBracket} />
              Check-in
            </button>
          )}

          {booking.status === 'CheckedIn' && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={loading}
              onClick={() => handleCheckOut(booking.id)}
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Check-out
            </button>
          )}

          <button
            type="button"
            className="btn-danger btn-sm"
            disabled={loading}
            onClick={() => handleCancel(booking.id)}
          >
            <FontAwesomeIcon icon={faTrashCan} />
            Cancelar
          </button>
        </div>
      )}
    </article>
  );

  return (
    <section className="section-card booking-section">
      {/* HEADER */}
      <div className="card-header booking-header">
        <div className="booking-heading">
          <div className="booking-heading-icon">
            <FontAwesomeIcon icon={faCalendarDays} />
          </div>

          <div>
            <span className="booking-eyebrow">
              STUDIUM BOOKING SERVICE
            </span>

            <h2>Reservas & Agendamentos</h2>

            <p className="hint">
              Gerencie reservas, conflitos e disponibilidade
              dos espaços institucionais.
            </p>
          </div>
        </div>

        <div className="booking-header-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handleLoadOccupancy}
            disabled={reportLoading}
          >
            <FontAwesomeIcon
              icon={reportLoading ? faSpinner : faChartColumn}
              spin={reportLoading}
            />
            Relatório de ocupação
          </button>

          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={refreshData}
            disabled={loading || roomsLoading}
          >
            <FontAwesomeIcon
              icon={loading ? faSpinner : faRotate}
              spin={loading}
            />
            Atualizar
          </button>
        </div>
      </div>

      {/* ARQUITETURA */}
      <div className="booking-architecture">
        <span>
          <FontAwesomeIcon icon={faShieldHalved} />
          Prevenção de conflitos
        </span>

        <span>
          <FontAwesomeIcon icon={faBuilding} />
          PostgreSQL GiST
        </span>

        <span>
          <FontAwesomeIcon icon={faLayerGroup} />
          3 réplicas EKS
        </span>
      </div>

      {/* MENSAGENS */}
      {message && (
        <div
          className={`booking-feedback ${
            message.isError
              ? 'booking-feedback-error'
              : 'booking-feedback-success'
          }`}
          role="alert"
        >
          <FontAwesomeIcon
            icon={
              message.isError
                ? faCircleExclamation
                : faCircleCheck
            }
          />

          <span>{message.text}</span>

          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Fechar mensagem"
          >
            ×
          </button>
        </div>
      )}

      {/* RELATÓRIO */}
      {occupancyReport && (
        <div className="booking-report">
          <div className="booking-panel-title">
            <div>
              <h3>
                <FontAwesomeIcon icon={faChartPie} />
                Relatório de ocupação
              </h3>
              <p>Indicadores operacionais do serviço.</p>
            </div>
          </div>

          <div className="booking-stats">
            <div className="booking-stat-card">
              <div className="booking-stat-icon">
                <FontAwesomeIcon icon={faCalendarDays} />
              </div>
              <span>Total de reservas</span>
              <strong>
                {occupancyReport.totalBookings || 0}
              </strong>
            </div>

            <div className="booking-stat-card">
              <div className="booking-stat-icon">
                <FontAwesomeIcon icon={faClipboardCheck} />
              </div>
              <span>Taxa de check-in</span>
              <strong>
                {(
                  (occupancyReport.checkInRate || 0) * 100
                ).toFixed(0)}
                %
              </strong>
            </div>

            <div className="booking-stat-card">
              <div className="booking-stat-icon">
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <span>Taxa de no-show</span>
              <strong>
                {(
                  (occupancyReport.noShowRate || 0) * 100
                ).toFixed(0)}
                %
              </strong>
            </div>

            <div className="booking-stat-card">
              <div className="booking-stat-icon">
                <FontAwesomeIcon icon={faHourglassHalf} />
              </div>
              <span>Horas alocadas</span>
              <strong>
                {Number(
                  occupancyReport.totalBookedHours || 0
                ).toFixed(1)}
                h
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* LAYOUT PRINCIPAL */}
      <div className="booking-layout">
        {/* FORMULÁRIO */}
        <div className="booking-form-panel">
          <div className="booking-panel-title">
            <div>
              <h3>
                <FontAwesomeIcon icon={faCalendarPlus} />
                Nova reserva
              </h3>

              <p>
                Selecione uma sala e defina o período.
              </p>
            </div>

            <span className="booking-panel-tag">
              Formato 24h
            </span>
          </div>

          <div className="booking-form-content">
            <div className="booking-form-group">
              <label htmlFor="booking-room">
                Sala institucional
              </label>

              {availableRooms.length > 0 ? (
                <select
                  id="booking-room"
                  value={roomId}
                  onChange={(event) =>
                    handleRoomChange(event.target.value)
                  }
                  className="booking-input"
                >
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.code}) — Andar{' '}
                      {room.floor}, Cap. {room.capacity}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="booking-room-fallback">
                  <input
                    id="booking-room"
                    type="text"
                    placeholder="ID da sala (UUID)"
                    value={roomId}
                    onChange={(event) =>
                      handleRoomChange(event.target.value)
                    }
                    className="booking-input"
                  />

                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => checkRoomStatus(roomId)}
                  >
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                    />
                    Status
                  </button>
                </div>
              )}
            </div>

            {selectedRoom && (
              <div className="booking-selected-room">
                <div className="booking-selected-room-icon">
                  <FontAwesomeIcon icon={faDoorOpen} />
                </div>

                <div>
                  <strong>{selectedRoom.name}</strong>
                  <span>
                    <FontAwesomeIcon icon={faUsers} />
                    {selectedRoom.capacity} pessoas
                    <span className="booking-meta-separator">
                      ·
                    </span>
                    Andar {selectedRoom.floor}
                  </span>
                </div>
              </div>
            )}

            {roomStatus && (
              <div className="booking-room-status-row">
                <span>Status da sala</span>

                <span
                  className={`booking-status booking-status-${getStatusClass(
                    roomStatus
                  )}`}
                >
                  <span className="booking-status-dot" />
                  {getStatusLabel(roomStatus)}
                </span>
              </div>
            )}

            <div className="booking-form-divider" />

            <div className="booking-date-grid">
              <div className="booking-form-group">
                <label htmlFor="booking-date">
                  Data da reserva
                </label>

                <input
                  id="booking-date"
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  className="booking-input"
                  required
                />
              </div>

              <div className="booking-form-group">
                <label htmlFor="booking-start">
                  Horário de início
                </label>

                <input
                  id="booking-start"
                  type="time"
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(event.target.value)
                  }
                  className="booking-input"
                  required
                />
              </div>

              <div className="booking-form-group">
                <label htmlFor="booking-end">
                  Horário de término
                </label>

                <input
                  id="booking-end"
                  type="time"
                  value={endTime}
                  onChange={(event) =>
                    setEndTime(event.target.value)
                  }
                  className="booking-input"
                  required
                />
              </div>
            </div>

            <div
              className={`booking-duration ${
                durationValidation.valid
                  ? 'booking-duration-valid'
                  : 'booking-duration-invalid'
              }`}
            >
              <FontAwesomeIcon
                icon={
                  durationValidation.valid
                    ? faCircleCheck
                    : faCircleExclamation
                }
              />

              <span>{durationValidation.message}</span>
            </div>

            <div className="booking-form-group">
              <label htmlFor="booking-purpose">
                Finalidade da reserva
              </label>

              <input
                id="booking-purpose"
                type="text"
                value={purpose}
                onChange={(event) =>
                  setPurpose(event.target.value)
                }
                placeholder="Ex: Grupo de estudos"
                className="booking-input"
              />
            </div>

            <div className="booking-form-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={
                  loading ||
                  !roomId ||
                  !durationValidation.valid
                }
                onClick={handleCreateBooking}
              >
                <FontAwesomeIcon
                  icon={loading ? faSpinner : faCalendarPlus}
                  spin={loading}
                />
                Confirmar reserva
              </button>

              <button
                type="button"
                className="btn-warning btn-sm"
                disabled={
                  loading ||
                  !roomId ||
                  !durationValidation.valid
                }
                onClick={handleJoinWaitlist}
              >
                <FontAwesomeIcon icon={faListOl} />
                Fila de espera
              </button>
            </div>
          </div>

          {/* LINHA DO TEMPO */}
          {safeTimeline.length > 0 && (
            <div className="booking-timeline-panel">
              <div className="booking-panel-title">
                <div>
                  <h3>
                    <FontAwesomeIcon icon={faClock} />
                    Grade de horários
                  </h3>
                  <p>Ocupação registrada para a sala.</p>
                </div>
              </div>

              <div className="booking-timeline-list">
                {safeTimeline.slice(0, 5).map((slot, index) => (
                  <div
                    className="booking-timeline-item"
                    key={index}
                  >
                    <div className="booking-timeline-time">
                      <FontAwesomeIcon icon={faClock} />

                      <span>
                        {formatTime24h(slot.startsAtUtc)}
                        {' — '}
                        {formatTime24h(slot.endsAtUtc)}
                      </span>
                    </div>

                    <span
                      className={`booking-status booking-status-${getStatusClass(
                        slot.status
                      )}`}
                    >
                      <span className="booking-status-dot" />
                      {getStatusLabel(slot.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MINHAS RESERVAS */}
        <div className="booking-list-panel">
          <div className="booking-panel-title">
            <div>
              <h3>
                <FontAwesomeIcon icon={faCalendarDays} />
                Minhas reservas
              </h3>

              <p>
                Acompanhe seus agendamentos e check-ins.
              </p>
            </div>

            <span className="booking-count">
              {activeBookings.length} ativas
            </span>
          </div>

          <div className="booking-list-summary">
            <div>
              <span>Reservas em andamento</span>
              <strong>{activeBookings.length}</strong>
            </div>

            <div>
              <span>Histórico</span>
              <strong>{historyBookings.length}</strong>
            </div>

            <div>
              <span>Fila de espera</span>
              <strong>{safeWaitlist.length}</strong>
            </div>
          </div>

          <div className="bookings-scroll-list">
            {activeBookings.length > 0 ? (
              activeBookings.map(renderBookingCard)
            ) : (
              <div className="booking-empty">
                <FontAwesomeIcon icon={faInbox} />

                <h4>Nenhuma reserva ativa</h4>

                <p>
                  Suas reservas confirmadas aparecerão aqui.
                </p>
              </div>
            )}
          </div>

          {historyBookings.length > 0 && (
            <div className="booking-history">
              <button
                type="button"
                className="booking-history-toggle"
                onClick={() =>
                  setShowHistory((previous) => !previous)
                }
                aria-expanded={showHistory}
              >
                <span>
                  <FontAwesomeIcon icon={faClock} />
                  Histórico de reservas
                  <span className="booking-history-count">
                    {historyBookings.length}
                  </span>
                </span>

                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={
                    showHistory ? 'booking-chevron-open' : ''
                  }
                />
              </button>

              {showHistory && (
                <div className="booking-history-list">
                  {historyBookings.map(renderBookingCard)}
                </div>
              )}
            </div>
          )}

          <div className="booking-list-footer">
            <FontAwesomeIcon icon={faCircleInfo} />

            <span>
              Os agendamentos são validados pelo serviço
              Studium-Booking para evitar conflitos de horário.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingSection;
