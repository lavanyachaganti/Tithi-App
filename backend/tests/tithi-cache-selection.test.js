const test = require('node:test');
const assert = require('node:assert/strict');
const { canUseCachedTithiForDate } = require('../utils/tithiCacheDecision');

test('uses cached tithi when the cache date matches the requested date even if the requested time is outside the stored tithi period', () => {
  const result = canUseCachedTithiForDate({
    requestedDate: '2026-06-30',
    cacheDate: '2026-06-30',
    tithiData: {
      name: 'Pratipada',
      start: '2026-06-30T05:26:42+05:30',
      end: '2026-07-01T07:38:41+05:30',
    },
  });

  assert.equal(result, true);
});

test('does not use cached tithi when the cache date does not match the requested date', () => {
  const result = canUseCachedTithiForDate({
    requestedDate: '2026-06-30',
    cacheDate: '2026-06-29',
    tithiData: {
      name: 'Pratipada',
      start: '2026-06-29T05:26:42+05:30',
      end: '2026-06-30T07:38:41+05:30',
    },
  });

  assert.equal(result, false);
});
