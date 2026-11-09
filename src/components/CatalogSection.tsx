import React, { useState, useEffect } from 'react';
import { Building, Room, AuthUser } from '../types';
import { apiRequest } from '../services/api';

interface CatalogSectionProps {
  user: AuthUser | null;
  onSelectRoomForBooking?: (room: Room) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({ user, onSelectRoomForBooking }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [operatingHours, setOperatingHours] = useState<any[]>([]);
  const [maintenanceReason, setMaintenanceReason] = useState('Manutenção Técnica Preventiva');
  const [maintenanceHours, setMaintenanceHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Direct room reservation state in Catalog
  const getInitialDate = () => {
    const d = new Date();
    if (d.getHours() >= 20) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  const [bookingDate, setBookingDate] = useState(getInitialDate());
  const [bookingStartTime, setBookingStartTime] = useState('10:00');
  const [bookingEndTime, setBookingEndTime] = useState('12:00');
  const [bookingPurpose, setBookingPurpose] = useState('Estudos e Trabalho Acadêmico');
  const [bookingLoading, setBookingLoading] = useState(false);

  const calculateDurationMinutes = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const currentDurationMinutes = calculateDurationMinutes(bookingStartTime, bookingEndTime);

  const validateDuration = (minutes: number, role?: string) => {
    if (minutes <= 0) {
      return { valid: false, message: 'Horário de término deve ser após o horário de início.' };
    }
    if (minutes < 15) {
      return { valid: false, message: 'Duração mínima permitida: 15 minutos.' };
    }
    const maxMinutes = role === 'Professor' || role === 'Administrator' ? 300 : 120;
    const roleLimitDesc = role === 'Professor' ? '5 horas (Professor)' : role === 'Administrator' ? '5 horas (Admin)' : '2 horas (Estudante)';

    if (minutes > maxMinutes) {
      return {
        valid: false,
        message: `Limite excedido: máximo ${roleLimitDesc}. Selecionado: ${Math.floor(minutes / 60)}h ${minutes % 60}m.`,
      };
    }

    return {
      valid: true,
      message: `Duração calculada: ${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : '00m'} (Permitido: máx ${roleLimitDesc})`,
    };
  };

  const durationValidation = validateDuration(currentDurationMinutes, user?.role);

  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      const bResp = await apiRequest<any>('/api/catalog/buildings');
      if (bResp.ok && bResp.data) {
        const bList = Array.isArray(bResp.data)
          ? bResp.data
          : Array.isArray(bResp.data.items)
          ? bResp.data.items
          : [];
        setBuildings(bList);
      } else {
        setBuildings([]);
      }

      const rResp = await apiRequest<any>('/api/catalog/rooms');
      if (rResp.ok && rResp.data) {
        const rList = Array.isArray(rResp.data)
          ? rResp.data
          : Array.isArray(rResp.data.items)
          ? rResp.data.items
          : [];
        setRooms(rList);
        if (rList.length > 0 && !selectedRoom) {
          handleSelectRoom(rList[0]);
        }
      } else {
        setRooms([]);
      }
    } catch (e: any) {
      setMessage({ text: `Erro ao carregar catálogo: ${e.message}`, isError: true });
      setBuildings([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const handleSelectRoom = async (room: Room) => {
    setSelectedRoom(room);
    try {
      const resp = await apiRequest<any>(`/api/catalog/rooms/${room.id}`);
      if (resp.ok && resp.data) {
        const hList = Array.isArray(resp.data.operatingHours)
          ? resp.data.operatingHours
          : [];
        setOperatingHours(hList);
      } else {
        setOperatingHours([]);
      }
    } catch {
      setOperatingHours([]);
    }
  };

  const handleDirectBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    if (!user) {
      setMessage({ text: '⚠️ Faça login com um usuário no topo antes de reservar.', isError: true });
      return;
    }

    if (!durationValidation.valid) {
      setMessage({ text: `⚠️ ${durationValidation.message}`, isError: true });
      return;
    }

    setBookingLoading(true);
    setMessage(null);

    try {
      const startsAtLocal = new Date(`${bookingDate}T${bookingStartTime}:00`);
      const endsAtLocal = new Date(`${bookingDate}T${bookingEndTime}:00`);

      const resp = await apiRequest('/api/bookings', {
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
          text: `🎉 Reserva criada com sucesso para ${selectedRoom.name}! Horário: ${bookingStartTime} às ${bookingEndTime} (24h). Código Check-in: ${resp.data?.checkInCode || 'N/A'}.`,
          isError: false,
        });
      } else {
        const errMsg = resp.data?.detail || resp.data?.title || resp.data?.message || `Falha HTTP ${resp.status}`;
        setMessage({ text: `❌ Não foi possível reservar: ${errMsg}`, isError: true });
      }
    } catch (err: any) {
      setMessage({ text: `❌ Erro de conexão: ${err.message}`, isError: true });
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
    const endsAt = new Date(now.getTime() + maintenanceHours * 60 * 60 * 1000);
    const endsAtUtc = endsAt.toISOString();

    try {
      const resp = await apiRequest(`/api/catalog/rooms/${selectedRoom.id}/maintenance-blocks`, {
        method: 'POST',
        body: JSON.stringify({
          startsAtUtc,
          endsAtUtc,
          reason: maintenanceReason,
        }),
      });

      if (resp.ok) {
        setMessage({
          text: `✅ Manutenção agendada com sucesso para ${selectedRoom.name}! Evento RoomMaintenanceScheduled publicado via SQS.`,
          isError: false,
        });
        fetchCatalogData();
      } else {
        const errMsg = resp.data?.detail || resp.data?.message || 'Erro ao agendar';
        setMessage({ text: `❌ Falha: ${errMsg}`, isError: true });
      }
    } catch (e: any) {
      setMessage({ text: `❌ Erro: ${e.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    setMessage(null);
    try {
      // 1. Create Building
      const bRes = await apiRequest('/api/catalog/buildings', {
        method: 'POST',
        body: JSON.stringify({
          code: 'BLOCO-02',
          name: 'Bloco 2 - Politécnico PUCPR',
          address: 'Rua Imaculada Conceição, 1155, Prado Velho, Curitiba - PR',
          description: 'Prédio da Escola Politécnica e Laboratórios de Computação',
        }),
      });

      let bId = bRes.data?.id;
      if (!bId && buildings.length > 0) {
        bId = buildings[0].id;
      }

      if (bId) {
        // 2. Create Rooms
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

        setMessage({ text: '🎉 Prédio e salas de demonstração criados com sucesso!', isError: false });
        await fetchCatalogData();
      } else {
        setMessage({ text: `Erro ao criar prédio: ${bRes.data?.message || 'Resposta inesperada'}`, isError: true });
      }
    } catch (err: any) {
      setMessage({ text: `Erro ao gerar dados: ${err.message}`, isError: true });
    } finally {
      setSeeding(false);
    }
  };

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeOperatingHours = Array.isArray(operatingHours) ? operatingHours : [];

  return (
    <div className="section-card">
      <div className="card-header">
        <div>
          <h3>🏛️ Catálogo de Espaços e Instalações (Studium-Catalog)</h3>
          <p className="hint">Prédios, salas, capacidade, horários de funcionamento e bloqueios de manutenção.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {user?.role === 'Administrator' && safeRooms.length === 0 && (
            <button onClick={handleSeedDemoData} disabled={seeding} className="btn-primary btn-sm">
              {seeding ? 'Cadastrando...' : '✨ Cadastrar Salas de Demonstração'}
            </button>
          )}
          <button onClick={fetchCatalogData} disabled={loading} className="btn-secondary btn-sm">
            {loading ? 'Carregando...' : '🔄 Atualizar Catálogo'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.isError ? 'alert-error' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
        {/* Buildings & Rooms List */}
        <div className="sub-card">
          <h4>Salas e Espaços Cadastrados ({safeRooms.length})</h4>
          {safeRooms.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b' }}>
              <p>📭 Nenhuma sala cadastrada no momento.</p>
              {user?.role === 'Administrator' ? (
                <p className="text-xs text-muted" style={{ marginTop: '8px' }}>
                  Como <strong>Administrador</strong>, você pode clicar no botão <strong>"✨ Cadastrar Salas de Demonstração"</strong> acima para criar prédios e salas de teste.
                </p>
              ) : (
                <p className="text-xs text-muted" style={{ marginTop: '8px' }}>
                  Faça login como Administrador acima para cadastrar prédios e salas de aula.
                </p>
              )}
            </div>
          ) : (
            <div className="rooms-scroll-list" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {safeRooms.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelectRoom(r)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: selectedRoom?.id === r.id ? '#e0f2fe' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: selectedRoom?.id === r.id ? '4px solid #2563eb' : '4px solid transparent',
                  }}
                >
                  <div>
                    <strong>{r.name}</strong> <span className="font-mono text-xs">({r.code})</span>
                    <div className="text-muted text-xs">
                      Capacidade: {r.capacity} pessoas | Andar: {r.floor} | Tipo: {r.type}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`badge ${r.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {r.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRoom(r);
                      }}
                      className="btn-primary btn-xs"
                    >
                      Reservar 📅
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Room Details & Instant Booking Form */}
        <div className="sub-card">
          <h4>Detalhes & Reserva da Sala</h4>
          {selectedRoom ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h5>{selectedRoom.name} ({selectedRoom.code})</h5>
                  <p className="text-xs font-mono text-muted">ID: {selectedRoom.id}</p>
                </div>
                <span className="badge badge-info">Capacidade: {selectedRoom.capacity}</span>
              </div>

              {/* Direct Booking Form in Catalog with 24h inputs and role limits */}
              <div className="card-subpanel" style={{ borderLeft: '4px solid #2563eb', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h5 style={{ color: '#1e40af', margin: 0 }}>📅 Reservar esta Sala Agora</h5>
                  <span className="text-xs text-muted">
                    {user?.role === 'Professor' ? 'Regra: Máx 5 horas' : user?.role === 'Administrator' ? 'Regra: Máx 5 horas' : 'Regra Estudante: Máx 2 horas'}
                  </span>
                </div>

                <form onSubmit={handleDirectBooking}>
                  <div className="form-row">
                    <label>
                      Data:
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        required
                        style={{ marginLeft: '6px' }}
                      />
                    </label>
                    <label>
                      Início (24h):
                      <input
                        type="time"
                        value={bookingStartTime}
                        onChange={(e) => setBookingStartTime(e.target.value)}
                        required
                        style={{ marginLeft: '6px', width: '100px' }}
                      />
                    </label>
                    <label>
                      Término (24h):
                      <input
                        type="time"
                        value={bookingEndTime}
                        onChange={(e) => setBookingEndTime(e.target.value)}
                        required
                        style={{ marginLeft: '6px', width: '100px' }}
                      />
                    </label>
                  </div>

                  {/* Dynamic Duration Validation Status */}
                  <div style={{ margin: '6px 0', fontSize: '0.82rem' }}>
                    <span className={`badge ${durationValidation.valid ? 'badge-success' : 'badge-danger'}`}>
                      {durationValidation.message}
                    </span>
                  </div>

                  <div className="form-group" style={{ marginTop: '6px' }}>
                    <label>Finalidade:</label>
                    <input
                      type="text"
                      value={bookingPurpose}
                      onChange={(e) => setBookingPurpose(e.target.value)}
                      placeholder="Ex: Grupo de Estudos N2"
                      className="full-width"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="submit"
                      disabled={bookingLoading || !durationValidation.valid}
                      className="btn-primary btn-sm"
                    >
                      {bookingLoading ? 'Processando...' : 'Confirmar Reserva Imediata 📅'}
                    </button>
                    {onSelectRoomForBooking && (
                      <button
                        type="button"
                        onClick={() => onSelectRoomForBooking(selectedRoom)}
                        className="btn-secondary btn-sm"
                      >
                        Abrir Linha do Tempo Completa 🕒
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Operating Hours in 24h format */}
              <div className="card-subpanel">
                <strong className="text-xs">Horários Institucionais de Funcionamento (24h):</strong>
                {safeOperatingHours.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', marginTop: '6px' }}>
                    {safeOperatingHours.map((h, i) => (
                      <li key={i}>
                        Dia {h.dayOfWeek}: {h.opensAt.substring(0, 5)} às {h.closesAt.substring(0, 5)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted text-xs" style={{ marginTop: '4px' }}>
                    Horário padrão de funcionamento no campus: <strong>07:00 às 22:30</strong> (24h).
                  </p>
                )}
              </div>

              {/* Maintenance scheduling (Professors or Admins) */}
              {(user?.role === 'Administrator' || user?.role === 'Professor') && (
                <div className="card-subpanel" style={{ borderLeft: '3px solid #dc2626' }}>
                  <strong className="text-xs">🔧 Agendar Bloqueio Temporário de Manutenção (UC008)</strong>
                  <div className="form-row" style={{ marginTop: '8px' }}>
                    <label>
                      Duração (horas):
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={maintenanceHours}
                        onChange={(e) => setMaintenanceHours(parseInt(e.target.value) || 1)}
                        style={{ width: '80px', marginLeft: '6px' }}
                      />
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Justificativa:</label>
                    <input
                      type="text"
                      value={maintenanceReason}
                      onChange={(e) => setMaintenanceReason(e.target.value)}
                      className="full-width"
                    />
                  </div>
                  <button
                    onClick={handleScheduleMaintenance}
                    disabled={loading}
                    className="btn-danger btn-sm"
                  >
                    Agendar Manutenção Agora
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted text-sm" style={{ padding: '24px 0', textAlign: 'center' }}>
              Clique em uma sala à esquerda para reservar ou inspecionar detalhes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
