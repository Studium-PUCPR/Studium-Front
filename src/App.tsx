
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faBuilding,
  faCalendarDays,
  faUserGear,
  faBell,
} from '@fortawesome/free-solid-svg-icons';

import { AuthUser, Room } from './types';
import { getStoredUser } from './services/cognito';
import { AuthBar } from './components/AuthBar';
import { CatalogSection } from './components/CatalogSection';
import { BookingSection } from './components/BookingSection';
import { UsersSection } from './components/UsersSection';
import { NotificationsSection } from './components/NotificationsSection';
import { ConsoleInspector } from './components/ConsoleInspector';

type Tab = 'catalog' | 'booking' | 'users' | 'notifications';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [selectedRoomForBooking, setSelectedRoomForBooking] =
    useState<Room | null>(null);

  useEffect(() => {
    const user = getStoredUser();

    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleUserChange = (user: AuthUser | null) => {
    setCurrentUser(user);
  };

  const handleSelectRoomForBooking = (room: Room) => {
    setSelectedRoomForBooking(room);
    setActiveTab('booking');
  };

  const navigationItems = [
    {
      id: 'catalog',
      label: 'Salas & Catálogo',
      icon: faBuilding,
    },
    {
      id: 'booking',
      label: 'Reservas & Agendamentos',
      icon: faCalendarDays,
    },
    {
      id: 'users',
      label: 'Meu Perfil & Admin',
      icon: faUserGear,
    },
    {
      id: 'notifications',
      label: 'Notificações',
      icon: faBell,
    },
  ] as const;

  return (
    <div className="app-container">

      {/* Header */}
      <header className="header-bar">
        <div className="logo-section">
          <div className="brand-icon">
            <FontAwesomeIcon icon={faGraduationCap} />
          </div>

          <div className="brand-info">
            <h1>Studium Platform</h1>
            <span className="subtitle">
              Plataforma Cloud Native de Reserva de Salas
            </span>
          </div>
        </div>

        <div className="header-badge">
          <span className="status-dot" />
          Amazon EKS & Microserviços
        </div>
      </header>

      {/* Authentication */}
      <AuthBar
        user={currentUser}
        onUserChange={handleUserChange}
      />

      {/* Navigation */}
      <nav className="tabs-nav" aria-label="Navegação principal">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab-btn ${
              activeTab === item.id ? 'active' : ''
            }`}
            onClick={() => setActiveTab(item.id)}
            aria-current={
              activeTab === item.id ? 'page' : undefined
            }
          >
            <FontAwesomeIcon
              icon={item.icon}
              className="tab-icon"
            />

            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="tab-content">
        {activeTab === 'catalog' && (
          <CatalogSection
            user={currentUser}
            onSelectRoomForBooking={handleSelectRoomForBooking}
          />
        )}

        {activeTab === 'booking' && (
          <BookingSection
            user={currentUser}
            selectedRoomFromCatalog={selectedRoomForBooking}
          />
        )}

        {activeTab === 'users' && (
          <UsersSection user={currentUser} />
        )}

        {activeTab === 'notifications' && (
          <NotificationsSection user={currentUser} />
        )}
      </main>

      {/* Network Inspector */}
      <ConsoleInspector />
    </div>
  );
};

export default App;
