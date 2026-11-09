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
  const [message, setMessage] = useState<string | null>(null);

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
      } else {
        setRooms([]);
      }
    } catch (e: any) {
      setMessage(`Erro ao carregar catálogo: ${e.message}`);
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
      const resp = await apiRequest<any>(`/api/catalog/rooms/${room.id}/operating-hours`);
      if (resp.ok && resp.data) {
        const hList = Array.isArray(resp.data)
          ? resp.data
          : Array.isArray(resp.data.items)
          ? resp.data.items
          : [];
        setOperatingHours(hList);
      } else {
        setOperatingHours([]);
      }
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
        setMessage(`✅ Manutenção agendada com sucesso para ${selectedRoom.name}! Evento RoomMaintenanceScheduled publicado via SQS.`);
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

        setMessage('🎉 Prédio e salas de demonstração criados com sucesso!');
        await fetchCatalogData();
      } else {
        setMessage(`Erro ao criar prédio: ${bRes.data?.message || 'Resposta inesperada'}`);
      }
    } catch (err: any) {
      setMessage(`Erro ao gerar dados: ${err.message}`);
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

      {message && <div className="alert alert-info">{message}</div>}

      <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
            <div className="rooms-scroll-list" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {safeRooms.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelectRoom(r)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: selectedRoom?.id === r.id ? '#f1f5f9' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
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
          )}
        </div>

        {/* Selected Room Details */}
        <div className="sub-card">
          <h4>Detalhes da Sala Selecionada</h4>
          {selectedRoom ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h5>{selectedRoom.name} ({selectedRoom.code})</h5>
              <p className="text-xs font-mono"><strong>ID:</strong> {selectedRoom.id}</p>
              <p className="text-sm"><strong>Capacidade:</strong> {selectedRoom.capacity} pessoas</p>

              <div className="card-subpanel">
                <strong className="text-xs">Horários de Funcionamento da Semana:</strong>
                {safeOperatingHours.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', marginTop: '6px' }}>
                    {safeOperatingHours.map((h, i) => (
                      <li key={i}>
                        Dia {h.dayOfWeek}: {h.opensAt} às {h.closesAt}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted text-xs" style={{ marginTop: '4px' }}>
                    Horário padrão institucional (07:00 às 22:30).
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
              Clique em uma sala à esquerda para inspecionar detalhes, horários e agendar manutenção.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
