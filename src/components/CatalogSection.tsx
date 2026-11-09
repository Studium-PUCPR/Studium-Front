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
  const [message, setMessage] = useState<string | null>(null);

  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      const bResp = await apiRequest<Building[]>('/api/catalog/buildings');
      if (bResp.ok) setBuildings(bResp.data);

      const rResp = await apiRequest<Room[]>('/api/catalog/rooms');
      if (rResp.ok) setRooms(rResp.data);
    } catch (e: any) {
      setMessage(`Erro ao carregar catálogo: ${e.message}`);
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
      const resp = await apiRequest<any[]>(`/api/catalog/rooms/${room.id}/operating-hours`);
      if (resp.ok) setOperatingHours(resp.data);
    } catch {
      setOperatingHours([]);
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
      const resp = await apiRequest(`/api/catalog/rooms/${selectedRoom.id}/maintenance`, {
        method: 'POST',
        body: JSON.stringify({
          startsAtUtc,
          endsAtUtc,
          reason: maintenanceReason,
        }),
      });

      if (resp.ok) {
        setMessage(`✅ Manutenção agendada com sucesso para ${selectedRoom.name}! Evento publicado no SQS.`);
        fetchCatalogData();
      } else {
        setMessage(`❌ Falha: ${resp.data?.detail || resp.data?.message || 'Erro ao agendar'}`);
      }
    } catch (e: any) {
      setMessage(`❌ Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div>
          <h2>🏛️ Catálogo de Espaços e Instalações (Studium-Catalog)</h2>
          <p className="section-desc">Prédios, salas, capacidade, horários de funcionamento e bloqueios de manutenção.</p>
        </div>
        <button onClick={fetchCatalogData} disabled={loading} className="btn-secondary btn-sm">
          🔄 Atualizar Catálogo
        </button>
      </div>

      {message && <div className="status-banner">{message}</div>}

      <div className="catalog-grid">
        {/* Buildings & Rooms List */}
        <div className="sub-card">
          <h3>Salas e Espaços Cadastrados ({rooms.length})</h3>
          <div className="rooms-scroll-list">
            {rooms.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelectRoom(r)}
                className={`room-item-row ${selectedRoom?.id === r.id ? 'active' : ''}`}
              >
                <div>
                  <strong>{r.name}</strong> <span className="room-code">({r.code})</span>
                  <div className="room-meta">
                    Capacidade: {r.capacity} pessoas | Andar: {r.floor} | Tipo: {r.type}
                  </div>
                </div>
                <div className="room-actions">
                  <span className={`status-pill ${r.isActive ? 'pill-active' : 'pill-inactive'}`}>
                    {r.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  {onSelectRoomForBooking && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoomForBooking(r);
                      }}
                      className="btn-primary btn-xs"
                    >
                      Reservar 📅
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Room Details */}
        <div className="sub-card">
          <h3>Detalhes da Sala Selecionada</h3>
          {selectedRoom ? (
            <div className="selected-room-view">
              <h4>{selectedRoom.name} ({selectedRoom.code})</h4>
              <p><strong>ID:</strong> <code>{selectedRoom.id}</code></p>
              <p><strong>Capacidade:</strong> {selectedRoom.capacity} pessoas</p>

              <div className="operating-hours-box">
                <h5>Horários de Funcionamento da Semana:</h5>
                {operatingHours.length > 0 ? (
                  <ul>
                    {operatingHours.map((h, i) => (
                      <li key={i}>
                        Dia {h.dayOfWeek}: {h.opensAt} às {h.closesAt}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">Horário padrão institucional (07:00 às 22:30).</p>
                )}
              </div>

              {/* Maintenance scheduling (Professors or Admins) */}
              {(user?.role === 'Administrator' || user?.role === 'Professor') && (
                <div className="maintenance-action-box">
                  <h5>🔧 Agendar Bloqueio Temporário de Manutenção (UC008)</h5>
                  <div className="form-row">
                    <label>
                      Duração (horas):
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={maintenanceHours}
                        onChange={(e) => setMaintenanceHours(parseInt(e.target.value) || 1)}
                        className="input-field-sm"
                      />
                    </label>
                    <label>
                      Justificativa:
                      <input
                        type="text"
                        value={maintenanceReason}
                        onChange={(e) => setMaintenanceReason(e.target.value)}
                        className="input-field"
                      />
                    </label>
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
            <p className="empty-state-text">Clique em uma sala à esquerda para inspecionar horários e agendar manutenção.</p>
          )}
        </div>
      </div>
    </div>
  );
};
