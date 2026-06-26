const parseRequestedDateTime = (requestedDate, requestedTime) => {
  if (!requestedDate) {
    return new Date();
  }

  const normalizedDate = String(requestedDate).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return new Date();
  }

  const sanitizedTime = requestedTime && String(requestedTime).trim();
  const normalizedTime = /^\d{2}:\d{2}$/.test(sanitizedTime) ? sanitizedTime : '12:00';
  return new Date(`${normalizedDate}T${normalizedTime}:00+05:30`);
};

const canUseCachedTithiForDate = ({ requestedDate, requestedTime, cacheDate, tithiData }) => {
  if (!tithiData) {
    return false;
  }

  if (!cacheDate) {
    return false;
  }

  const normalizedRequestedDate = String(requestedDate || '').trim();
  const normalizedCacheDate = String(cacheDate || '').trim();
  if (normalizedRequestedDate && normalizedCacheDate && normalizedRequestedDate !== normalizedCacheDate) {
    return false;
  }

  const queryDate = parseRequestedDateTime(requestedDate, requestedTime);
  const cacheStart = tithiData.start ? new Date(tithiData.start) : null;
  const cacheEnd = tithiData.end ? new Date(tithiData.end) : null;

  if (!cacheStart || !cacheEnd || Number.isNaN(cacheStart.getTime()) || Number.isNaN(cacheEnd.getTime())) {
    return false;
  }

  return queryDate >= cacheStart && queryDate <= cacheEnd;
};

module.exports = {
  parseRequestedDateTime,
  canUseCachedTithiForDate,
};
