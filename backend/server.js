const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

// File-based logger for debugging
const debugLogFile = path.join(__dirname, "debug.log");
const debugLog = (message) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(debugLogFile, logLine);
  } catch (error) {
    // Avoid breaking API flows if the debug log file is briefly locked on Windows
    console.warn(`[debugLog] ${error.message}`);
  }
  console.log(logLine);
};
const User = require("./models/User");
const Notification = require("./models/Notification");
const PanchangCache = require("./models/PanchangCache");
const { getPanchangTest } = require("./utils/panchangTest");
const {
  parseQueryDate,
  formatDateTime,
  getTithiData,
  getVarjyamPeriodsForDay,
  getPanchangData,
  getIstDateString,
  LOCATION,
  TIMEZONE,
  TIMEZONE_LABEL,
} = require("./utils/panchangCalculations");
const {
  fetchTithiFromProkerala,
  fetchVarjyamFromProkerala,
  getIstDateString: getProkeralaIstDateString,
} = require("./utils/prokeralaClient");
const { canUseCachedTithiForDate } = require("./utils/tithiCacheDecision");

const app = express();
const PORT = process.env.PORT || 5000;

const parseRequestedDateTime = (requestedDate, requestedTime) => {
  if (!requestedDate) {
    return new Date();
  }

  const normalizedDate = String(requestedDate).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return new Date();
  }

  const sanitizedTime = requestedTime && String(requestedTime).trim();
  const normalizedTime = /^\d{2}:\d{2}$/.test(sanitizedTime) ? sanitizedTime : "12:00";
  return new Date(`${normalizedDate}T${normalizedTime}:00+05:30`);
};

const MIN_VARJYAM_MINUTES = 10;
const calculateVarjyamDurationMinutes = (start, end) => {
  if (!start || !end) return 0;
  const startTime = new Date(start);
  const endTime = new Date(end);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
    return 0;
  }
  return (endTime.getTime() - startTime.getTime()) / 60000;
};

const toPlainObject = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return { ...value };
  }
};

const normalizeVarjyamPeriods = (periods = [], source = "unknown") => {
  if (!Array.isArray(periods)) {
    console.log(`[Varjyam][${source}] No periods to normalize`);
    return [];
  }

  const preserveProkeralaPeriods = String(source).toLowerCase().includes("prokerala");

  return periods.reduce((acc, period) => {
    const plainPeriod = toPlainObject(period);
    const start = plainPeriod?.start || period?.start || "";
    const end = plainPeriod?.end || period?.end || "";
    const durationMinutes = calculateVarjyamDurationMinutes(start, end);
    console.log(`[Varjyam][${source}] start=${start} end=${end} duration=${durationMinutes.toFixed(2)} minutes`);

    if (!preserveProkeralaPeriods && durationMinutes < MIN_VARJYAM_MINUTES) {
      console.log(`[Varjyam][${source}] Skipping invalid Varjyam period because duration < ${MIN_VARJYAM_MINUTES} minutes`);
      return acc;
    }

    if (durationMinutes <= 0) {
      console.log(`[Varjyam][${source}] Skipping Varjyam period because duration is not positive`);
      return acc;
    }

    acc.push({ start, end, durationMinutes });
    return acc;
  }, []);
};

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = (process.env.CORS_ORIGIN || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json());

// Handle invalid JSON payloads (body-parser SyntaxError) and return JSON errors
app.use((err, req, res, next) => {
  if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON payload:', err.message);
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  next(err);
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend Running Successfully" });
});

app.get(["/health", "/api/health"], (req, res) => {
  res.json({ status: "ok", port: PORT });
});

app.get(["/panchang-test", "/api/panchang-test"], async (req, res) => {
  try {
    const date = req.query.date || null;
    const result = getPanchangTest(date);
    res.json(result);
  } catch (error) {
    console.error("Panchang test failed:", error.message || error);
    res.status(500).json({ error: "Unable to compute panchang test data." });
  }
});

// ============================================================================
// Display Tithi in requested language (Telugu, Tamil, etc)
const getDisplayTithi = (lang, tithiName) => {
  const normalized = (lang || "").toLowerCase();

  if (normalized === "telugu") {
    const pakshaMap = {
      Shukla: "శుక్ల",
      Krishna: "కృష్ణ",
    };
    const tithiMap = {
      Pratipada: "ప్రతిపద",
      Dwitiya: "ద్వితీయ",
      Tritiya: "త్రితీయ",
      Chaturthi: "చతుర్ధి",
      Panchami: "పంచమీ",
      Shashthi: "షష్ఠి",
      Saptami: "సప్తమీ",
      Ashtami: "అష్టమీ",
      Navami: "నవమీ",
      Dashami: "దశమీ",
      Ekadashi: "ఏకాదశి",
      Dwadashi: "ద్వాదశి",
      Trayodashi: "త్రయోదశి",
      Chaturdashi: "చతుర్దశి",
      Purnima: "పూర్ణిమ",
      Amavasya: "అమావాస్య",
    };

    const parts = String(tithiName || "").split(/\s+/).filter(Boolean);
    if (parts.length === 2) {
      return `${pakshaMap[parts[0]] || parts[0]} ${tithiMap[parts[1]] || parts[1]}`;
    }

    return tithiMap[tithiName] || tithiName;
  }

  if (normalized === "tamil") {
    const pakshaMap = {
      Shukla: "சுக்ல",
      Krishna: "க்ஷீர",
    };
    const tamilMap = {
      Pratipada: "பிரதிபதா",
      Dwitiya: "துவிதிய",
      Tritiya: "த்திருதிய",
      Chaturthi: "சதுர்த்தி",
      Panchami: "பஞ்சமி",
      Shashthi: "ஷஷ்டி",
      Saptami: "சப்தமி",
      Ashtami: "அஷ்டமி",
      Navami: "நவமி",
      Dashami: "தசமி",
      Ekadashi: "ஏகாதசி",
      Dwadashi: "த்வாதசி",
      Trayodashi: "திரயோதசி",
      Chaturdashi: "சதுர்தசீ",
      Purnima: "பூர்ணிமா",
      Amavasya: "அமாவாசை",
    };

    const parts = String(tithiName || "").split(/\s+/).filter(Boolean);
    if (parts.length === 2) {
      return `${pakshaMap[parts[0]] || parts[0]} ${tamilMap[parts[1]] || parts[1]}`;
    }

    return tamilMap[tithiName] || tithiName;
  }

  return tithiName;
};

const fetchAndCachePanchangForDate = async (queryDate) => {
  const istDate = queryDate.toLocaleDateString("en-CA", { timeZone: TIMEZONE_LABEL });
  let cache = await PanchangCache.findOne({ date: istDate });
  if (cache) {
    return cache;
  }

  debugLog(`[/api/refresh-helper] Auto-refreshing data for ${istDate}`);

  let tithi = null;
  let varjyam = [];

  try {
    tithi = await fetchTithiFromProkerala(queryDate);
  } catch (error) {
    debugLog(`[/api/refresh-helper] Tithi fetch failed for ${istDate}: ${error.message}`);
    throw error;
  }

  try {
    const rawVarjyam = await fetchVarjyamFromProkerala(queryDate);
    varjyam = normalizeVarjyamPeriods(rawVarjyam, "Prokerala");
  } catch (error) {
    debugLog(`[/api/refresh-helper] Varjyam fetch failed for ${istDate}: ${error.message}`);
    varjyam = [];
  }

  try {
    cache = new PanchangCache({
      date: istDate,
      source: "prokerala-live",
      tithi,
      varjyam,
      createdAt: new Date(),
    });
    await cache.save();
    debugLog(`[/api/refresh-helper] Cache saved for ${istDate}`);
  } catch (error) {
    debugLog(`[/api/refresh-helper] Cache save failed for ${istDate}: ${error.message}`);
  }

  return cache;
};

const buildVarjyamNotificationMessage = (date, varjyamDetails) => {
  const formatted = varjyamDetails.map((item) => {
    const start = item.start || "unknown";
    const end = item.end ? ` to ${item.end}` : "";
    return `${item.name}: ${start}${end}`;
  });

  return `Varjyam update for ${date}: ${formatted.join("; ")}`;
};

const createVarjyamNotificationIfMissing = async (date, varjyamDetails) => {
  if (!Array.isArray(varjyamDetails) || varjyamDetails.length === 0) {
    return null;
  }

  try {
    const existing = await Notification.findOne({ type: "varjyam", eventDate: date });
    if (existing) {
      return existing;
    }

    const message = buildVarjyamNotificationMessage(date, varjyamDetails);

    return await Notification.create({
      user: null,
      type: "admin",
      title: "Varjyam update",
      message,
      eventDate: date,
      meta: { varjyamDetails },
    });
  } catch (error) {
    console.warn(`⚠️  Could not create notification for ${date}:`, error.message);
    return null;
  }
};

app.use("/api", authRoutes);

// Global error handler to ensure JSON responses on server errors
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err && err.message ? err.message : err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal server error.' });
});

app.get(["/tithi", "/api/tithi"], async (req, res) => {
  try {
    const { date: requestedDate, time: requestedTime, lang } = req.query;
    const queryDate = parseRequestedDateTime(requestedDate, requestedTime);
    const istDate = queryDate.toLocaleDateString("en-CA", { timeZone: TIMEZONE_LABEL });

    debugLog(`[/api/tithi] Reading cache for date: ${istDate} requestedDate=${requestedDate} requestedTime=${requestedTime}`);

    const cache = await PanchangCache.findOne({ date: istDate });
    let tithiData = cache?.tithi || null;
    let source = cache?.source || "panchang-ts-fallback";

    if (!tithiData) {
      if (!cache) {
        debugLog(`[/api/tithi] No cache found for ${istDate}, using local Panchang fallback`);
      } else {
        debugLog(`[/api/tithi] Cache found but missing tithi data for ${istDate}, using local Panchang fallback`);
      }
    }

    if (cache && tithiData && requestedTime) {
      const shouldUseCache = canUseCachedTithiForDate({
        requestedDate,
        requestedTime,
        cacheDate: cache?.date,
        tithiData,
      });

      if (!shouldUseCache) {
        debugLog(`[/api/tithi] Requested time ${queryDate.toISOString()} falls outside cached tithi period for ${cache?.date || istDate}, recomputing locally`);
        tithiData = null;
      }
    }

    if (!tithiData) {
      const panchang = getPanchangData(queryDate, requestedTime || "12:00");
      if (panchang && panchang.tithi) {
        tithiData = panchang.tithi;
        source = "panchang-ts-fallback";
      }
    }

    if (!tithiData && cache) {
      debugLog(`[/api/tithi] Falling back to cached tithi for ${istDate}`);
      tithiData = cache.tithi;
      source = cache.source;
    }

    if (!tithiData) {
      debugLog(`[/api/tithi] No tithi data available for ${istDate}`);
      return res.status(404).json({
        success: false,
        needsRefresh: true,
        message: "Panchang data not cached and local fallback failed. Please click refresh button.",
        date: istDate,
      });
    }

    const tithiName = getDisplayTithi(lang, tithiData.name);

    res.json({
      success: true,
      source,
      tithi: tithiName,
      tithiName: tithiData.name,
      paksha: tithiData.paksha,
      startTime: tithiData.startTime || tithiData.start || "",
      endTime: tithiData.endTime || tithiData.end || "",
      completionPercentage: tithiData.completionPercentage || 0,
      date: istDate,
      coordinates: "17.3850,78.4867",
    });
  } catch (error) {
    console.error("Tithi fetch failed:", error.message);
    debugLog(`[/api/tithi] Error: ${error.message}`);
    res.status(500).json({ error: "Unable to fetch Tithi data", success: false });
  }
});

// ============================================================================
// Refresh endpoint: Call Prokerala and cache result
// This is the ONLY endpoint that calls Prokerala APIs
// User must click refresh button to trigger this
// ============================================================================
app.post(["/panchang/refresh", "/api/panchang/refresh"], async (req, res) => {
  try {
    const { date: requestedDate, time: requestedTime } = req.query;
    const queryDate = parseRequestedDateTime(requestedDate, requestedTime);
    const istDate = queryDate.toLocaleDateString("en-CA", { timeZone: TIMEZONE_LABEL });
    const refreshTime = formatDateTime(queryDate);

    debugLog(`[/api/panchang/refresh] Refresh requested for ${refreshTime} requestedDate=${requestedDate} requestedTime=${requestedTime}`);

    // ALWAYS fetch fresh data from Prokerala (don't use cache for refresh)
    let tithi = null;
    let varjyam = [];

    try {
      debugLog(`[/api/panchang/refresh] Fetching FRESH Tithi from Prokerala at requested time (${refreshTime})...`);
      tithi = await fetchTithiFromProkerala(queryDate);
      debugLog(`[/api/panchang/refresh] Tithi fetched: ${tithi.name} (${tithi.paksha})`);
    } catch (error) {
      debugLog(`[/api/panchang/refresh] Tithi fetch failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch Tithi from Prokerala",
      });
    }

    try {
      debugLog(`[/api/panchang/refresh] Fetching Varjyam from Prokerala at requested time...`);
      const rawVarjyam = await fetchVarjyamFromProkerala(queryDate);
      debugLog(`[/api/panchang/refresh] Varjyam fetched: ${rawVarjyam.length} periods`);
      varjyam = normalizeVarjyamPeriods(rawVarjyam, "Prokerala");
      debugLog(`[/api/panchang/refresh] Varjyam after filtering: ${varjyam.length} valid periods`);
    } catch (error) {
      debugLog(`[/api/panchang/refresh] Varjyam fetch failed: ${error.message}`);
      // Don't fail the entire request if Varjyam fails
      console.warn("Varjyam fetch failed, continuing with Tithi only:", error.message);
      varjyam = [];
    }

    // Save to MongoDB cache (update or create)
    try {
      const cacheData = {
        date: istDate,
        source: "prokerala-live",
        tithi,
        varjyam,
        createdAt: new Date(),
      };

      // Use findOneAndUpdate to handle concurrent refresh requests gracefully
      await PanchangCache.findOneAndUpdate(
        { date: istDate },
        cacheData,
        { upsert: true, new: true }
      );

      debugLog(`[/api/panchang/refresh] Cache updated/saved for ${istDate}`);
    } catch (error) {
      debugLog(`[/api/panchang/refresh] Cache save failed: ${error.message}`);
      console.warn("Failed to save cache, but returning data anyway:", error.message);
      // Don't fail - return the data even if cache save failed
    }

    // Return the fresh data with refresh timestamp
    res.json({
      success: true,
      source: "prokerala-live",
      message: "Prokerala data fetched fresh",
      date: istDate,
      refreshTime,
      tithi,
      varjyam,
    });
  } catch (error) {
    console.error("Refresh failed:", error.message);
    debugLog(`[/api/panchang/refresh] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Unable to refresh Panchang data",
    });
  }
});

const getStoredVarjyamNotification = async (queryDate) => {
  try {
    return await Notification.findOne({
      type: "admin",
      title: "Varjyam update",
      eventDate: queryDate,
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.warn(`⚠️  Could not retrieve stored notification for ${queryDate}:`, error.message);
    return null;
  }
};

app.get(["/varjyam/notification", "/api/varjyam/notification"], async (req, res) => {
  try {
    const { date: requestedDate, time: requestedTime } = req.query;
    const queryDate = parseRequestedDateTime(requestedDate, requestedTime);
    const istDate = queryDate.toLocaleDateString("en-CA", { timeZone: TIMEZONE_LABEL });

    debugLog(`[/api/varjyam/notification] Reading cache for ${istDate} requestedDate=${requestedDate} requestedTime=${requestedTime}`);

    let cache = await PanchangCache.findOne({ date: istDate });

    if (cache) {
      debugLog(`[/api/varjyam/notification] Cache found, source: ${cache.source}`);
      const rawCachedVarjyam = Array.isArray(cache.varjyam) ? cache.varjyam : [];
      const cachedVarjyam = normalizeVarjyamPeriods(rawCachedVarjyam.map((period) => ({
        start: period?.start || "",
        end: period?.end || "",
      })), cache.source || "cache");
      return res.json({
        success: true,
        source: cache.source,
        date: istDate,
        varjyam: cachedVarjyam,
        coordinates: "17.3850,78.4867",
      });
    }

    debugLog(`[/api/varjyam/notification] No cache found for ${istDate}; using local panchang-ts fallback without calling Prokerala`);

    debugLog(`[/api/varjyam/notification] Falling back to local panchang-ts Varjyam for ${istDate}`);
    const panchang = getPanchangData(queryDate, requestedTime || "12:00");

    if (!panchang) {
      debugLog(`[/api/varjyam/notification] Local fallback failed for ${istDate}`);
      return res.status(500).json({
        success: false,
        error: "Unable to compute Varjyam data",
      });
    }

    const rawLocalVarjyam = Array.isArray(panchang.varjyamDetails) ? panchang.varjyamDetails : [];
    const localVarjyam = normalizeVarjyamPeriods(rawLocalVarjyam, "panchang-ts");
    debugLog(`[/api/varjyam/notification] Computed local Varjyam count=${localVarjyam.length}`);

    res.json({
      success: true,
      source: "panchang-ts-fallback",
      date: istDate,
      varjyam: localVarjyam,
      coordinates: "17.3850,78.4867",
    });
  } catch (error) {
    console.error("Varjyam notification request failed:", error.message);
    debugLog(`[/api/varjyam/notification] Error: ${error.message}`);

    res.status(500).json({
      success: false,
      error: "Unable to fetch Varjyam data",
    });
  }
});

connectDB()
  .then(() => {
    console.log("Database connected successfully");
    debugLog("==== SERVER STARTUP - DATABASE CONNECTED ====");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      debugLog(`==== SERVER STARTED ON PORT ${PORT} ====`);
    });
  })
  .catch((error) => {
    // If database connection fails, start server anyway
    console.warn("⚠️  Database connection failed:", error.message);
    console.warn("⚠️  Starting server without database. Cache endpoints will not work.");
    debugLog("==== SERVER STARTUP - DATABASE FAILED ====");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (database offline)`);
      debugLog(`==== SERVER STARTED ON PORT ${PORT} (DATABASE OFFLINE) ====`);
    });
  });
