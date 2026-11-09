import React, { useState, useEffect } from 'react';
import { AuthUser } from './types';
import { getStoredUser } from './services/cognito';
import { AuthBar } from './components/AuthBar';
import { CatalogSection } from './components/CatalogSection';
import { BookingSection } from './components/BookingSection';
import { UsersSection } from './components/UsersSection';
import { NotificationsSection } from './components/NotificationsSection';
import { ConsoleInspector } from './components/ConsoleInspector';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'booking' | 'users' | 'notifications'>('catalog');

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleUserChange = (user: AuthUser | null) => {
    setCurrentUser(user);
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="header-bar">
        <div className="logo-section">
          <h1>🎓 Studium Platform</h1>
          <div className="subtitle">
            Plataforma Cloud Native de Reserva de Salas — Amazon EKS & Microserviços
          </div>
        </div>
      </header>

      {/* Cognito Authentication Bar */}
      <AuthBar
        user={currentUser}
        onUserChange={handleUserChange}
      />

      {/* Tab Navigation */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          🏢 Salas & Catálogo (Catalog)
        </button>
        <button
          className={`tab-btn ${activeTab === 'booking' ? 'active' : ''}`}
          onClick={() => setActiveTab('booking')}
        >
          📅 Reservas & Agendamentos (Booking)
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👤 Meu Perfil & Admin (Users)
        </button>
        <button
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notificações (Python/DynamoDB)
        </button>
      </nav>

      {/* Main Tab Content */}
      <main className="tab-content">
        {activeTab === 'catalog' && <CatalogSection user={currentUser} />}
        {activeTab === 'booking' && <BookingSection user={currentUser} />}
        {activeTab === 'users' && <UsersSection user={currentUser} />}
        {activeTab === 'notifications' && <NotificationsSection user={currentUser} />}
      </main>

      {/* Real-time HTTP REST Network Console Inspector */}
      <ConsoleInspector />
    </div>
  );
};

export default App;
