let eventClients = [];
let activityClients = [];

function registerEventsClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial ping to check connection
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Events stream established' })}\n\n`);

  eventClients.push(res);

  req.on('close', () => {
    eventClients = eventClients.filter(client => client !== res);
  });
}

function registerActivitiesClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Activities stream established' })}\n\n`);

  activityClients.push(res);

  req.on('close', () => {
    activityClients = activityClients.filter(client => client !== res);
  });
}

function broadcastEventUpdate(eventId, action, data = {}) {
  const payload = {
    eventId,
    action, // e.g. 'LIKE', 'COMMENT', 'JOIN', 'UNJOIN', 'UNLIKE'
    timestamp: new Date(),
    ...data
  };
  eventClients.forEach(client => {
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  });
}

function broadcastActivityUpdate(activityId, action, data = {}) {
  const payload = {
    activityId,
    action, // e.g. 'JOIN', 'LEAVE', 'REVIEW', 'SAVE'
    timestamp: new Date(),
    ...data
  };
  activityClients.forEach(client => {
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  });
}

module.exports = {
  registerEventsClient,
  registerActivitiesClient,
  broadcastEventUpdate,
  broadcastActivityUpdate,
};
