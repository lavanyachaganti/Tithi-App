const axios = require('axios');
const PROKERALA_BASE_URL = 'https://api.prokerala.com';
const clientId = '730e52c4-cfad-4f73-9618-8677020c5ec3';
const clientSecret = 'eJUvG7OPqWFiCNFmfBagVDhk8zwXq45xlfsH1Ijf';
const LOCATION = { latitude: 17.3850, longitude: 78.4867 };
const date = new Date('2026-06-21T20:20:00+05:30');
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).formatToParts(date);
const values = parts.reduce((a,p) => { if (p.type !== 'literal') a[p.type] = p.value; return a; }, {});
const isoDateTime = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+05:30`;
console.log('query date', date.toISOString(), 'iso', isoDateTime);
async function token() {
  const resp = await axios.post(`${PROKERALA_BASE_URL}/token`, new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'read',
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return resp.data.access_token;
}
async function fetchUrl(url, params) {
  const accessToken = await token();
  const res = await axios.get(url, { params, headers: { Authorization: `Bearer ${accessToken}` } });
  console.log('===', url, params, 'status', res.status);
  console.log(JSON.stringify(res.data, null, 2).slice(0, 12000));
}
(async () => {
  try {
    await fetchUrl(`${PROKERALA_BASE_URL}/v2/astrology/panchang`, {
      ayanamsa: 1,
      coordinates: `${LOCATION.latitude},${LOCATION.longitude}`,
      datetime: isoDateTime,
      la: 'en',
    });
    console.log('----');
    await fetchUrl(`${PROKERALA_BASE_URL}/v2/astrology/inauspicious-period`, {
      ayanamsa: 1,
      coordinates: `${LOCATION.latitude},${LOCATION.longitude}`,
      datetime: isoDateTime,
      la: 'en',
    });
  } catch (err) {
    console.error('ERROR', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
})();
