
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faRotate,
  faPlus,
  faDoorOpen,
  faUsers,
  faLayerGroup,
  faCalendarDays,
  faClock,
  faArrowRight,
  faWrench,
  faCircleCheck,
  faCircleExclamation,
  faLocationDot,
  faGraduationCap,
  faChevronRight,
  faInbox,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

import { Building, Room, AuthUser } from '../types';
import { apiRequest } from '../services/api';

interface CatalogSectionProps {
  user: AuthUser | null;
  onSelectRoomForBooking?: (room: Room) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  user,
  onSelectRoomForBooking,
}) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [operatingHours, setOperatingHours] = useState<any[]>([]);

  const [maintenanceReason, setMaintenanceReason] = useState(
    'Manutenção Técnica Preventiva'
  );
  const [maintenanceHours, setMaintenanceHours] = useState(2);

  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [message, setMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  const getInitialDate = () => {
    const date = new Date();

    if (date.getHours() >= 20) {
      date.setDate(date.getDate() + 1);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const [bookingDate, setBookingDate] = useState(getInitialDate);
  const [bookingStartTime, setBookingStartTime] = useState('10:00');
  const [bookingEndTime, setBookingEndTime] = useState('12:00');
  const [bookingPurpose, setBookingPurpose] = useState(
    'Estudos e Trabalho Acadêmico'
  );
  const [bookingLoading, setBookingLoading] = useState(false);

  const calculateDurationMinutes = (
    startStr: string,
    endStr: string
  ) => {
    if (!startStr || !endStr) return 0;

    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);

    return eh * 60 + em - (sh * 60 + sm);
  };

  const currentDurationMinutes = calculateDurationMinutes(
    bookingStartTime,
    bookingEndTime
  );

  const validateDuration = (minutes: number, role?: string) => {
    if (minutes <= 0) {
      return {
        valid: false,
        message: 'O término deve ser após o início.',
      };
    }

    if (minutes < 15) {
      return {
        valid: false,
        message: 'Duração mínima: 15 minutos.',
      };
    }

    const maxMinutes =
      role === 'Professor' || role === 'Administrator' ? 300 : 120;

    const roleLimitDesc =
      role === 'Professor'
        ? '5 horas (Professor)'
        : role === 'Administrator'
          ? '5 horas (Admin)'
          : '2 horas (Estudante)';

    if (minutes > maxMinutes) {
      return {
        valid: false,
        message: `Limite excedido. Máximo: ${roleLimitDesc}.`,
      };
    }

    return {
      valid: true,
      message: `Duração: ${Math.floor(minutes / 60)}h ${String(
        minutes % 60
      ).padStart(2, '0')}min · Limite: ${roleLimitDesc}`,
    };
  };

  const durationValidation = validateDuration(
    currentDurationMinutes,
    user?.role
  );

  const handleSelectRoom = async (room: Room) => {
    setSelectedRoom(room);
    setOperatingHours([]);

    try {
      const resp = await apiRequest<any>(
        `/api/catalog/rooms/${room.id}`
      );

      if (resp.ok && resp.data) {
        setOperatingHours(
          Array.isArray(resp.data.operatingHours)
            ? resp.data.operatingHours
            : []
        );
      }
    } catch {
      setOperatingHours([]);
    }
  };

  const fetchCatalogData = async () => {
    setLoading(true);

    try {
      const bResp = await apiRequest<any>(
        '/api/catalog/buildings'
      );

      const bList =
        bResp.ok && bResp.data
          ? Array.isArray(bResp.data)
            ? bResp.data
            : Array.isArray(bResp.data.items)
              ? bResp.data.items
              : []
          : [];

      setBuildings(bList);

      const rResp = await apiRequest<any>(
        '/api/catalog/rooms'
      );

      const rList: Room[] =
        rResp.ok && rResp.data
          ? Array.isArray(rResp.data)
            ? rResp.data
            : Array.isArray(rResp.data.items)
              ? rResp.data.items
              : []
          : [];

      setRooms(rList);

      if (rList.length > 0) {
        const room =
          rList.find((r) => r.id === selectedRoom?.id) ||
          rList[0];

        await handleSelectRoom(room);
      } else {
        setSelectedRoom(null);
        setOperatingHours([]);
      }
    } catch (e: any) {
      setMessage({
        text: `Erro ao carregar catálogo: ${e.message}`,
        isError: true,
      });
      setBuildings([]);
      setRooms([]);
      setSelectedRoom(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
    // Carregamento inicial do catálogo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDirectBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoom) return;

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

    setBookingLoading(true);
    setMessage(null);

    try {
      const startsAtLocal = new Date(
        `${bookingDate}T${bookingStartTime}:00`
      );

      const endsAtLocal = new Date(
        `${bookingDate}T${bookingEndTime}:00`
      );

      const resp = await apiRequest<any>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: selectedRoom.id,
          title: `${selectedRoom.name} (${selectedRoom.code})`,
          startsAtUtc: startsAtLocal.toISOString(),
          endsAtUtc: endsAtLocal.toISOString(),
          purpose: bookingPurpose,
        }),
      });

      if (resp.ok) {
        setMessage({
          text: `Reserva criada com sucesso para ${selectedRoom.name}! Horário: ${bookingStartTime} às ${bookingEndTime}. Código Check-in: ${resp.data?.checkInCode || 'N/A'}.`,
          isError: false,
        });
      } else {
        const errMsg =
          resp.data?.detail ||
          resp.data?.title ||
          resp.data?.message ||
          `Falha HTTP ${resp.status}`;

        setMessage({
          text: `Não foi possível reservar: ${errMsg}`,
          isError: true,
        });
      }
    } catch (err: any) {
      setMessage({
        text: `Erro de conexão: ${err.message}`,
        isError: true,
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleScheduleMaintenance = async () => {
    if (!selectedRoom) return;

    setLoading(true);
    setMessage(null);

    const now = new Date();
    const startsAtUtc = now.toISOString();

    const endsAt = new Date(
      now.getTime() + maintenanceHours * 60 * 60 * 1000
    );

    try {
      const resp = await apiRequest<any>(
        `/api/catalog/rooms/${selectedRoom.id}/maintenance-blocks`,
        {
          method: 'POST',
          body: JSON.stringify({
            startsAtUtc,
            endsAtUtc: endsAt.toISOString(),
            reason: maintenanceReason,
          }),
        }
      );

      if (resp.ok) {
        setMessage({
          text: `Manutenção agendada para ${selectedRoom.name}! Evento RoomMaintenanceScheduled publicado via RabbitMQ.`,
          isError: false,
        });

        await fetchCatalogData();
      } else {
        setMessage({
          text: `Falha: ${
            resp.data?.detail ||
            resp.data?.message ||
            'Erro ao agendar'
          }`,
          isError: true,
        });
      }
    } catch (e: any) {
      setMessage({
        text: `Erro: ${e.message}`,
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    setMessage(null);

    try {
      const bRes = await apiRequest<any>(
        '/api/catalog/buildings',
        {
          method: 'POST',
          body: JSON.stringify({
            code: 'BLOCO-02',
            name: 'Bloco 2 - Politécnico PUCPR',
            address:
              'Rua Imaculada Conceição, 1155, Prado Velho, Curitiba - PR',
            description:
              'Prédio da Escola Politécnica e Laboratórios de Computação',
          }),
        }
      );

      let bId = bRes.data?.id;

      if (!bId && buildings.length > 0) {
        bId = buildings[0].id;
      }

      if (bId) {
        await apiRequest('/api/catalog/rooms', {
          method: 'POST',
          body: JSON.stringify({
            buildingId: bId,
            code: 'LAB-204',
            name: 'Laboratório de Sistemas Distribuídos 204',
            floor: 2,
            capacity: 35,
            type: 'Laboratory',
            mapPositionX: 120,
            mapPositionY: 85,
          }),
        });

        await apiRequest('/api/catalog/rooms', {
          method: 'POST',
          body: JSON.stringify({
            buildingId: bId,
            code: 'SALA-301',
            name: 'Sala de Seminários e Estudos 301',
            floor: 3,
            capacity: 20,
            type: 'MeetingRoom',
            mapPositionX: 210,
            mapPositionY: 140,
          }),
        });

        setMessage({
          text: 'Prédio e salas de demonstração criados com sucesso!',
          isError: false,
        });

        await fetchCatalogData();
      } else {
        setMessage({
          text: `Erro ao criar prédio: ${
            bRes.data?.message || 'Resposta inesperada'
          }`,
          isError: true,
        });
      }
    } catch (err: any) {
      setMessage({
        text: `Erro ao gerar dados: ${err.message}`,
        isError: true,
      });
    } finally {
      setSeeding(false);
    }
  };

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeOperatingHours = Array.isArray(operatingHours)
    ? operatingHours
    : [];

  const canManageMaintenance =
    user?.role === 'Administrator' ||
    user?.role === 'Professor';

  return (
    <section className="section-card catalog-section">

      {/* CABEÇALHO */}
      <div className="card-header catalog-header">
        <div className="catalog-heading">
          <div className="catalog-heading-icon">
            <FontAwesomeIcon icon={faBuilding} />
          </div>

          <div>
            <span className="catalog-eyebrow">
              STUDIUM CATALOG SERVICE
            </span>
            <h2>Catálogo de Espaços</h2>
            <p className="hint">
              Gerencie salas, disponibilidade e reservas
              da instituição.
            </p>
          </div>
        </div>

        <div className="catalog-header-actions">
          {user?.role === 'Administrator' &&
            safeRooms.length === 0 && (
              <button
                type="button"
                onClick={handleSeedDemoData}
                disabled={seeding}
                className="btn-primary btn-sm"
              >
                <FontAwesomeIcon
                  icon={seeding ? faSpinner : faPlus}
                  spin={seeding}
                />
                {seeding
                  ? 'Cadastrando...'
                  : 'Criar salas demo'}
              </button>
            )}

          <button
            type="button"
            onClick={fetchCatalogData}
            disabled={loading}
            className="btn-secondary btn-sm"
          >
            <FontAwesomeIcon
              icon={loading ? faSpinner : faRotate}
              spin={loading}
            />
            Atualizar
          </button>
        </div>
      </div>

      {/* FEEDBACK */}
      {message && (
        <div
          className={`alert ${
            message.isError ? 'alert-error' : 'alert-success'
          } catalog-alert`}
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
        </div>
      )}

      {/* INDICADORES */}
      <div className="catalog-stats">
        <div className="catalog-stat-card">
          <div className="catalog-stat-icon">
            <FontAwesomeIcon icon={faDoorOpen} />
          </div>
          <div>
            <span>Salas cadastradas</span>
            <strong>{safeRooms.length}</strong>
          </div>
        </div>

        <div className="catalog-stat-card">
          <div className="catalog-stat-icon">
            <FontAwesomeIcon icon={faBuilding} />
          </div>
          <div>
            <span>Prédios</span>
            <strong>{buildings.length}</strong>
          </div>
        </div>

        <div className="catalog-stat-card">
          <div className="catalog-stat-icon">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <span>Capacidade total</span>
            <strong>
              {safeRooms.reduce(
                (total, room) => total + (Number(room.capacity) || 0),
                0
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="catalog-layout">

        {/* LISTA DE SALAS */}
        <div className="catalog-list-panel">
          <div className="catalog-panel-heading">
            <div>
              <h3>Salas disponíveis no catálogo</h3>
              <p>Selecione um espaço para visualizar detalhes.</p>
            </div>
            <span className="catalog-count">
              {safeRooms.length}
            </span>
          </div>

          {safeRooms.length === 0 ? (
            <div className="catalog-empty">
              <FontAwesomeIcon icon={faInbox} />
              <h4>Nenhuma sala cadastrada</h4>
              <p>
                {user?.role === 'Administrator'
                  ? 'Utilize o botão Criar salas demo para começar.'
                  : 'Entre como administrador para cadastrar salas.'}
              </p>
            </div>
          ) : (
            <div className="rooms-scroll-list">
              {safeRooms.map((room) => {
                const isSelected =
                  selectedRoom?.id === room.id;

                return (
                  <div
                    key={room.id}
                    className={`catalog-room-item ${
                      isSelected ? 'selected' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="catalog-room-select"
                      onClick={() => handleSelectRoom(room)}
                      aria-pressed={isSelected}
                    >
                      <div className="catalog-room-top">
                        <div className="catalog-room-icon">
                          <FontAwesomeIcon icon={faDoorOpen} />
                        </div>

                        <div className="catalog-room-info">
                          <strong>{room.name}</strong>
                          <span>{room.code}</span>
                        </div>
                      </div>

                      <div className="catalog-room-meta">
                        <span>
                          <FontAwesomeIcon icon={faUsers} />
                          {room.capacity} pessoas
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faLayerGroup} />
                          Andar {room.floor}
                        </span>
                      </div>
                    </button>

                    <div className="catalog-room-footer">
                      <span
                        className={`badge ${
                          room.isActive
                            ? 'badge-success'
                            : 'badge-danger'
                        }`}
                      >
                        {room.isActive ? 'Ativa' : 'Inativa'}
                      </span>

                      <button
                        type="button"
                        className="catalog-room-action"
                        onClick={() => handleSelectRoom(room)}
                      >
                        Selecionar
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DETALHES */}
        <div className="catalog-details-panel">
          <div className="catalog-panel-heading">
            <div>
              <h3>Detalhes & Reserva</h3>
              <p>Informações e agendamento do espaço.</p>
            </div>
          </div>

          {selectedRoom ? (
            <div className="catalog-details-content">

              <div className="catalog-selected-room">
                <div className="catalog-selected-icon">
                  <FontAwesomeIcon icon={faDoorOpen} />
                </div>

                <div className="catalog-selected-info">
                  <span className="catalog-eyebrow">
                    ESPAÇO SELECIONADO
                  </span>
                  <h3>{selectedRoom.name}</h3>
                  <p>{selectedRoom.code}</p>
                </div>

                <span className="badge badge-info">
                  <FontAwesomeIcon icon={faUsers} />
                  {selectedRoom.capacity} vagas
                </span>
              </div>

              <div className="catalog-room-properties">
                <span>
                  <FontAwesomeIcon icon={faLayerGroup} />
                  Andar {selectedRoom.floor}
                </span>
                <span>
                  <FontAwesomeIcon icon={faLocationDot} />
                  {selectedRoom.type}
                </span>
              </div>

              {/* FORMULÁRIO */}
              <div className="catalog-booking-panel">
                <div className="catalog-booking-heading">
                  <div>
                    <h4>
                      <FontAwesomeIcon icon={faCalendarDays} />
                      Reservar esta sala
                    </h4>
                    <p>
                      Escolha uma data e o período desejado.
                    </p>
                  </div>

                  <span className="catalog-booking-limit">
                    <FontAwesomeIcon icon={faClock} />
                    Máx. {canManageMaintenance ? '5h' : '2h'}
                  </span>
                </div>

                <form onSubmit={handleDirectBooking}>
                  <div className="catalog-booking-fields">
                    <label>
                      Data da reserva
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) =>
                          setBookingDate(e.target.value)
                        }
                        required
                      />
                    </label>

                    <label>
                      Horário de início
                      <input
                        type="time"
                        value={bookingStartTime}
                        onChange={(e) =>
                          setBookingStartTime(e.target.value)
                        }
                        required
                      />
                    </label>

                    <label>
                      Horário de término
                      <input
                        type="time"
                        value={bookingEndTime}
                        onChange={(e) =>
                          setBookingEndTime(e.target.value)
                        }
                        required
                      />
                    </label>
                  </div>

                  <div
                    className={`catalog-duration ${
                      durationValidation.valid
                        ? 'valid'
                        : 'invalid'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={
                        durationValidation.valid
                          ? faCircleCheck
                          : faCircleExclamation
                      }
                    />
                    {durationValidation.message}
                  </div>

                  <div className="form-group">
                    <label htmlFor="catalog-purpose">
                      Finalidade da reserva
                    </label>
                    <input
                      id="catalog-purpose"
                      type="text"
                      value={bookingPurpose}
                      onChange={(e) =>
                        setBookingPurpose(e.target.value)
                      }
                      placeholder="Ex: Grupo de estudos"
                      className="full-width"
                    />
                  </div>

                  <div className="catalog-booking-actions">
                    <button
                      type="submit"
                      disabled={
                        bookingLoading ||
                        !durationValidation.valid
                      }
                      className="btn-primary"
                    >
                      <FontAwesomeIcon
                        icon={
                          bookingLoading
                            ? faSpinner
                            : faCalendarDays
                        }
                        spin={bookingLoading}
                      />
                      {bookingLoading
                        ? 'Processando...'
                        : 'Confirmar reserva'}
                    </button>

                    {onSelectRoomForBooking && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectRoomForBooking(selectedRoom)
                        }
                        className="btn-secondary"
                      >
                        Ver linha do tempo
                        <FontAwesomeIcon icon={faArrowRight} />
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* HORÁRIOS */}
              <div className="catalog-info-panel">
                <h4>
                  <FontAwesomeIcon icon={faClock} />
                  Horários institucionais
                </h4>

                {safeOperatingHours.length > 0 ? (
                  <ul>
                    {safeOperatingHours.map((hour, index) => (
                      <li key={index}>
                        Dia {hour.dayOfWeek}: {' '}
                        {hour.opensAt.substring(0, 5)}
                        {' às '}
                        {hour.closesAt.substring(0, 5)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Funcionamento padrão do campus:
                    <strong> 07:00 às 22:30</strong>
                  </p>
                )}
              </div>

              {/* MANUTENÇÃO */}
              {canManageMaintenance && (
                <div className="catalog-maintenance-panel">
                  <h4>
                    <FontAwesomeIcon icon={faWrench} />
                    Bloqueio de manutenção
                  </h4>

                  <p>
                    Agende uma indisponibilidade temporária
                    para este espaço.
                  </p>

                  <div className="catalog-maintenance-fields">
                    <label>
                      Duração (horas)
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={maintenanceHours}
                        onChange={(e) =>
                          setMaintenanceHours(
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                    </label>

                    <label>
                      Justificativa
                      <input
                        type="text"
                        value={maintenanceReason}
                        onChange={(e) =>
                          setMaintenanceReason(e.target.value)
                        }
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleScheduleMaintenance}
                    disabled={loading}
                    className="btn-danger btn-sm"
                  >
                    <FontAwesomeIcon icon={faWrench} />
                    Agendar manutenção
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="catalog-empty">
              <FontAwesomeIcon icon={faDoorOpen} />
              <h4>Nenhuma sala selecionada</h4>
              <p>
                Escolha uma sala no catálogo para visualizar
                suas informações e realizar uma reserva.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
