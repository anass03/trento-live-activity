import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { mockCurrentUser, type AppUser } from '../data/mockUser';
import { getMe, getToken } from '../lib/api';
import { ActivitiesPage } from '../pages/ActivitiesPage';
import { ActivityDetailPage } from '../pages/ActivityDetailPage';
import { AdminEntitiesPage } from '../pages/AdminEntitiesPage';
import { AdminModerationPage } from '../pages/AdminModerationPage';
import { AdminPOIPage } from '../pages/AdminPOIPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { ComuneDashboardPage } from '../pages/ComuneDashboardPage';
import { ComuneExportPage } from '../pages/ComuneExportPage';
import { ComuneStatistichePage } from '../pages/ComuneStatistichePage';
import { EntityPublishPage } from '../pages/EntityPublishPage';
import { EventDetailPage } from '../pages/EventDetailPage';
import { EventsPage } from '../pages/EventsPage';
import { LoginPage } from '../pages/LoginPage';
import { MapPage } from '../pages/MapPage';
import { PasswordResetPage } from '../pages/PasswordResetPage';
import { OnboardingInteressiPage } from '../pages/OnboardingInteressiPage';
import { PrivacyPage } from '../pages/PrivacyPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RegistrationPage } from '../pages/RegistrationPage';
import { SettingsPage } from '../pages/SettingsPage';
import { TermsPage } from '../pages/TermsPage';
import { Setup2FAPage } from '../pages/Setup2FAPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';

function mapRuoloToRole(ruolo?: string): AppUser['role'] {
  switch (ruolo) {
    case 'UtenteRegistrato': return 'registered_user';
    case 'EnteCertificato': return 'certified_entity';
    case 'AmministratoreComunale': return 'municipal_admin';
    case 'AmministratoreDiSistema': return 'system_admin';
    default: return 'anonymous';
  }
}

export function App() {
  const [user, setUser] = useState<AppUser>(mockCurrentUser);

  function fetchUser() {
    if (!getToken()) {
      // Nessun token = nessuna identità. Mostra Ospite, non interpellare il
      // backend (l'endpoint pubblico /api/users/me era un mock che restituiva
      // sempre Mario Rossi e faceva sembrare l'utente ancora loggato dopo il logout).
      setUser(mockCurrentUser);
      return;
    }
    getMe()
      .then((u) => {
        const me = u as unknown as { id: string; nome: string; cognome: string; email: string; ruolo: string; interessi?: string[]; nomeEnte?: string; approvato?: boolean };
        setUser({
          id: me.id,
          name: me.nomeEnte || `${me.nome} ${me.cognome}`.trim() || me.email,
          email: me.email,
          role: mapRuoloToRole(me.ruolo),
          avatar: (me.nome || me.email)[0]?.toUpperCase() ?? '◯',
          ruolo: me.ruolo,
          interessi: me.interessi,
          nomeEnte: me.nomeEnte || null,
          approvato: me.approvato,
        });
      })
      .catch(() => setUser(mockCurrentUser));
  }

  useEffect(() => {
    fetchUser();
    window.addEventListener('tla:user-updated', fetchUser);
    return () => window.removeEventListener('tla:user-updated', fetchUser);
  }, []);

  return (
    <AppShell user={user}>
      <Routes>
        <Route path="/" element={<MapPage user={user} />} />
        <Route path="/attivita" element={user.role === 'certified_entity' ? <Navigate to="/eventi" replace /> : <ActivitiesPage user={user} />} />
        <Route path="/attivita/:id" element={user.role === 'certified_entity' ? <Navigate to="/eventi" replace /> : <ActivityDetailPage user={user} />} />
        <Route path="/eventi" element={<EventsPage user={user} />} />
        <Route path="/eventi/:id" element={<EventDetailPage user={user} />} />
        <Route path="/eventi-certificati" element={<EventsPage user={user} certifiedOnly />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrazione" element={<RegistrationPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/password-reset/:token" element={<PasswordResetPage />} />
        <Route path="/profilo" element={<ProfilePage />} />
        <Route path="/setup-2fa" element={<Setup2FAPage />} />
        <Route path="/verifica-email" element={<VerifyEmailPage />} />
        <Route path="/onboarding/interessi" element={<OnboardingInteressiPage />} />

        <Route path="/ente/pubblica" element={<EntityPublishPage />} />

        <Route path="/comune/dashboard" element={<ComuneDashboardPage />} />
        <Route path="/comune/statistiche" element={<ComuneStatistichePage />} />
        <Route path="/comune/export" element={<ComuneExportPage />} />

        <Route path="/admin/poi" element={<AdminPOIPage />} />
        <Route path="/admin/utenti" element={<AdminUsersPage />} />
        <Route path="/admin/enti/richieste" element={<AdminEntitiesPage />} />
        <Route path="/admin/moderazione" element={<AdminModerationPage />} />

        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/termini" element={<TermsPage />} />
        <Route path="/impostazioni" element={<SettingsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
