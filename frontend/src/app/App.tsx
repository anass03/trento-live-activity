import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { mockCurrentUser, type AppUser } from '../data/mockUser';
import { getCurrentUser } from '../lib/api';
import { ActivitiesPage } from '../pages/ActivitiesPage';
import { ActivityDetailPage } from '../pages/ActivityDetailPage';
import { EventDetailPage } from '../pages/EventDetailPage';
import { EventsPage } from '../pages/EventsPage';
import { MapPage } from '../pages/MapPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export function App() {
  const [user, setUser] = useState<AppUser>(mockCurrentUser);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(mockCurrentUser));
  }, []);

  return (
    <AppShell user={user}>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/attivita" element={<ActivitiesPage />} />
        <Route path="/attivita/:id" element={<ActivityDetailPage />} />
        <Route path="/eventi" element={<EventsPage />} />
        <Route path="/eventi/:id" element={<EventDetailPage />} />
        <Route path="/eventi-certificati" element={<EventsPage certifiedOnly />} />
        <Route path="/login" element={<PlaceholderPage title="Accedi" />} />
        <Route path="/registrazione" element={<PlaceholderPage title="Registrazione" />} />
        <Route path="/password-reset" element={<PlaceholderPage title="Password reset" />} />
        <Route path="/profilo" element={<PlaceholderPage title="Profilo" />} />
        <Route path="/comune/dashboard" element={<PlaceholderPage title="Dashboard Comune" />} />
        <Route path="/comune/statistiche" element={<PlaceholderPage title="Statistiche Comune" />} />
        <Route path="/comune/export" element={<PlaceholderPage title="Export Comune" />} />
        <Route path="/admin/poi" element={<PlaceholderPage title="Gestione POI" />} />
        <Route path="/admin/utenti" element={<PlaceholderPage title="Utenti" />} />
        <Route path="/admin/enti/richieste" element={<PlaceholderPage title="Richieste enti" />} />
        <Route path="/admin/moderazione" element={<PlaceholderPage title="Moderazione" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
