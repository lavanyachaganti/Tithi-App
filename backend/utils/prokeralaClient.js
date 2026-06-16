const axios = require("axios");
const path = require("path");
const fs = require("fs");

// File-based logger for debugging
const debugLogFile = path.join(__dirname, "..", "debug.log");
const debugLog = (message) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(debugLogFile, logLine);
  console.log(logLine);
};

const LOCATION = { latitude: 17.3850, longitude: 78.4867 }; // Hyderabad
const TIMEZONE_LABEL = "Asia/Kolkata";
const PROKERALA_BASE_URL = "https://api.prokerala.com";

/**
 * Get current IST date in YYYY-MM-DD format
 */
const getIstDateString = (date = new Date()) =>
  date.toLocaleDateString("en-CA", { timeZone: TIMEZONE_LABEL });

const formatIstDateTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_LABEL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = parts.reduce((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+05:30`;
};

/**
 * Get OAuth access token from Prokerala
 * Token is valid for 3600 seconds (1 hour)
 */
const getProkeralaToken = async () => {
  debugLog("[PROKERALA] Requesting OAuth token...");
  
  const clientId = process.env.Client_ID;
  const clientSecret = process.env.Client_Secret;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Client_ID or Client_Secret in environment variables");
  }

  try {
    const response = await axios.post(
      `${PROKERALA_BASE_URL}/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "read",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = response.data.access_token;
    if (!accessToken) {
      throw new Error("No access token in Prokerala response");
    }

    debugLog("[PROKERALA] Token obtained successfully");
    return accessToken;
  } catch (error) {
    debugLog(`[PROKERALA] Token request failed: ${error.message}`);
    throw new Error(`Prokerala OAuth failed: ${error.message}`);
  }
};

/**
 * Call Prokerala Panchang API and extract currently active Tithi only
 * 
 * Returns only the tithi that is active at the refresh time (IST now).
 * Validates that the refresh time falls between tithi start and end times.
 */
const fetchTithiFromProkerala = async (queryDate) => {
  debugLog(`[PROKERALA] Fetching Tithi for ${queryDate}...`);

  const accessToken = await getProkeralaToken();

  try {
    const isoDateTime = formatIstDateTime(queryDate);

    const response = await axios.get(
      `${PROKERALA_BASE_URL}/v2/astrology/panchang`,
      {
        params: {
          ayanamsa: 1, // Lahiri ayanamsa
          coordinates: `${LOCATION.latitude},${LOCATION.longitude}`,
          datetime: isoDateTime,
          la: "en", // English language
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    debugLog("[PROKERALA] Panchang API response received");

    const raw = response.data;
    const tithis = raw?.data?.tithi || [];

    if (!Array.isArray(tithis) || tithis.length === 0) {
      throw new Error("No tithi data in Prokerala response");
    }

    // The first tithi in the array is the currently active tithi at queryDate
    // Prokerala returns tithis in chronological order, with the active one first
    const tithiData = tithis[0];

    // Validate that the tithi is actually active at refresh time
    const tithiStart = new Date(tithiData.start);
    const tithiEnd = new Date(tithiData.end);
    const refreshTime = queryDate;

    if (isNaN(tithiStart.getTime()) || isNaN(tithiEnd.getTime())) {
      throw new Error(`Invalid tithi times: start=${tithiData.start}, end=${tithiData.end}`);
    }

    // Verify refresh time is within tithi period
    if (refreshTime < tithiStart || refreshTime > tithiEnd) {
      debugLog(
        `[PROKERALA] WARNING: Refresh time ${refreshTime.toISOString()} is outside tithi period ` +
        `[${tithiStart.toISOString()} - ${tithiEnd.toISOString()}]`
      );
    }

    const tithi = {
      name: tithiData.name || "",
      paksha: tithiData.paksha || "",
      start: tithiData.start || "",
      end: tithiData.end || "",
      completionPercentage: tithiData.completionPercentage || 0,
    };

    debugLog(`[PROKERALA] Active tithi extracted: ${tithi.name} (${tithi.paksha})`);
    debugLog(`[PROKERALA] Tithi period: ${tithi.start} to ${tithi.end}`);
    return tithi;
  } catch (error) {
    debugLog(`[PROKERALA] Tithi fetch failed: ${error.message}`);
    throw new Error(`Prokerala Tithi fetch failed: ${error.message}`);
  }
};

/**
 * Call Prokerala Inauspicious Period API and extract Varjyam only
 */
const fetchVarjyamFromProkerala = async (queryDate) => {
  debugLog(`[PROKERALA] Fetching Varjyam for ${queryDate}...`);

  const accessToken = await getProkeralaToken();

  try {
    const isoDateTime = formatIstDateTime(queryDate);

    const response = await axios.get(
      `${PROKERALA_BASE_URL}/v2/astrology/inauspicious-period`,
      {
        params: {
          ayanamsa: 1, // Lahiri ayanamsa
          coordinates: `${LOCATION.latitude},${LOCATION.longitude}`,
          datetime: isoDateTime,
          la: "en", // English language
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    debugLog("[PROKERALA] Inauspicious Period API response received");

    const raw = response.data;
    const muhurtas = raw?.data?.muhurat || [];

    // Find Varjyam from muhurtas
    const varjyamItem = Array.isArray(muhurtas)
      ? muhurtas.find((item) => item.name === "Varjyam")
      : null;

    if (!varjyamItem || !Array.isArray(varjyamItem.period)) {
      debugLog("[PROKERALA] No Varjyam periods found in response");
      return [];
    }

    const varjyam = varjyamItem.period.map((period) => ({
      start: period.start || "",
      end: period.end || "",
    }));

    debugLog(`[PROKERALA] Varjyam extracted: ${JSON.stringify(varjyam)}`);
    return varjyam;
  } catch (error) {
    debugLog(`[PROKERALA] Varjyam fetch failed: ${error.message}`);
    throw new Error(`Prokerala Varjyam fetch failed: ${error.message}`);
  }
};

module.exports = {
  getProkeralaToken,
  fetchTithiFromProkerala,
  fetchVarjyamFromProkerala,
  getIstDateString,
  LOCATION,
  TIMEZONE_LABEL,
};
