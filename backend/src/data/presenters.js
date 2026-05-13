const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(id, label = 'id') {
  if (!UUID_RE.test(id)) {
    throw { status: 400, code: 'INVALID_ID', error: `Invalid ${label}` };
  }
}

function plain(record) {
  return record?.toJSON ? record.toJSON() : record;
}

function timestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function dateTime(date, time) {
  if (!date) return null;
  return `${date}T${time || '00:00'}:00`;
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function locationFor(item) {
  const poi = item.poi || item.POI;
  if (poi?.nome) return poi.nome;
  if (item.latitudine != null && item.longitudine != null) {
    return `${item.latitudine}, ${item.longitudine}`;
  }
  return null;
}

function crowdingStatus(statoAffollamento) {
  return crowdingStatusForLevel(crowdLevelFromStatus(statoAffollamento));
}

function crowdLevelFromStatus(statoAffollamento) {
  const map = { verde: 22, giallo: 52, rosso: 90 };
  return map[statoAffollamento] || 25;
}

function crowdingStatusForLevel(level) {
  if (level >= 82) return 'red';
  if (level >= 62) return 'orange';
  if (level >= 34) return 'yellow';
  return 'green';
}

function crowdLevelFromRatio(participantCount, maxParticipants, fallback = 25) {
  if (!participantCount || !maxParticipants) return fallback;
  return Math.max(8, Math.min(100, Math.round((participantCount / maxParticipants) * 100)));
}

function roleForClient(ruolo) {
  const map = {
    UtenteRegistrato: 'registered_user',
    EnteCertificato: 'registered_user',
    AmministratoreComunale: 'municipal_admin',
    AmministratoreDiSistema: 'system_admin',
  };
  return map[ruolo] || 'anonymous';
}

function initialsFor(user) {
  const first = user.nome?.charAt(0) || '';
  const last = user.cognome?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'UT';
}

function serializeUser(record) {
  const user = plain(record);
  if (!user) {
    return { id: null, name: 'Ospite', email: null, role: 'anonymous', avatar: '◯' };
  }

  const displayName = user.nomeEnte || `${user.nome} ${user.cognome}`.trim();
  return {
    id: user.id,
    name: displayName,
    email: user.email,
    role: roleForClient(user.ruolo),
    roleLabel: user.ruolo,
    avatar: initialsFor(user),
  };
}

function serializeEvent(record) {
  const event = plain(record);
  return {
    id: event.id,
    title: event.titolo,
    description: event.descrizione || '',
    location: locationFor(event),
    dateTime: dateTime(event.data, event.orarioInizio),
    isCertified: Boolean(event.badgeVerifica),
    category: event.categoria,
    createdAt: timestamp(event.createdAt),
    latitude: event.latitudine,
    longitude: event.longitudine,
    startTime: event.orarioInizio,
    endTime: event.orarioFine,
    entity: event.entity
      ? {
          id: event.entity.id,
          name: event.entity.nomeEnte || [event.entity.nome, event.entity.cognome].filter(Boolean).join(' '),
        }
      : null,
  };
}

function serializeActivity(record) {
  const activity = plain(record);
  const participants = Array.isArray(activity.participants) ? activity.participants : [];

  return {
    id: activity.id,
    title: `Attività di ${capitalize(activity.tipo)}`,
    description: null,
    category: activity.tipo,
    location: locationFor(activity),
    participantCount: participants.length,
    participantIds: participants.map((p) => p.id),
    maxParticipants: activity.maxPartecipanti,
    createdAt: timestamp(activity.createdAt),
    dateTime: dateTime(activity.data, activity.orarioInizio),
    status: activity.stato,
    latitude: activity.latitudine,
    longitude: activity.longitudine,
    creator: activity.creator
      ? {
          id: activity.creator.id,
          name: [activity.creator.nome, activity.creator.cognome].filter(Boolean).join(' '),
        }
      : null,
  };
}

function serializePOI(record) {
  const poi = plain(record);
  return {
    id: poi.id,
    title: poi.nome,
    description: poi.descrizione || '',
    category: poi.tipo,
    latitude: poi.latitudine,
    longitude: poi.longitudine,
    crowdingStatus: crowdingStatus(poi.statoAffollamento),
    createdAt: timestamp(poi.createdAt),
  };
}

function markerFromPOI(record) {
  const poi = plain(record);
  const crowdLevel = crowdLevelFromStatus(poi.statoAffollamento);
  return {
    id: `poi:${poi.id}`,
    type: 'poi',
    title: poi.nome,
    latitude: poi.latitudine,
    longitude: poi.longitudine,
    crowdLevel,
    crowdingStatus: crowdingStatusForLevel(crowdLevel),
    isCertified: false,
    sourceId: poi.id,
    category: poi.tipo,
    description: poi.descrizione || 'Punto di interesse cittadino.',
    dateTime: null,
  };
}

function markerFromActivity(record) {
  const activity = plain(record);
  const participants = Array.isArray(activity.participants) ? activity.participants : [];
  const fallback = crowdLevelFromStatus(activity.poi?.statoAffollamento);
  const crowdLevel = crowdLevelFromRatio(participants.length, activity.maxPartecipanti, fallback);
  return {
    id: `activity:${activity.id}`,
    type: 'activity',
    title: `Attività di ${capitalize(activity.tipo)}`,
    latitude: activity.latitudine,
    longitude: activity.longitudine,
    crowdLevel,
    crowdingStatus: crowdingStatusForLevel(crowdLevel),
    isCertified: false,
    sourceId: activity.id,
    category: activity.tipo,
    description: `Attività spontanea di ${activity.tipo}. Partecipanti: ${participants.length}/${activity.maxPartecipanti}.`,
    dateTime: dateTime(activity.data, activity.orarioInizio),
  };
}

function markerFromEvent(record) {
  const event = plain(record);
  const baseLevel = crowdLevelFromStatus(event.poi?.statoAffollamento);
  const popularityBoost = Math.min(18, Math.floor((event.views || 0) / 8));
  const crowdLevel = Math.min(100, baseLevel + popularityBoost);
  return {
    id: `event:${event.id}`,
    type: 'event',
    title: event.titolo,
    latitude: event.latitudine,
    longitude: event.longitudine,
    crowdLevel,
    crowdingStatus: crowdingStatusForLevel(crowdLevel),
    isCertified: Boolean(event.badgeVerifica),
    sourceId: event.id,
    category: event.categoria,
    description: event.descrizione || 'Evento certificato su Trento Live Activity.',
    dateTime: dateTime(event.data, event.orarioInizio),
  };
}

module.exports = {
  assertUuid,
  serializeActivity,
  serializeEvent,
  serializePOI,
  serializeUser,
  markerFromActivity,
  markerFromEvent,
  markerFromPOI,
};
