const { getDailyPanchang, getInstantPanchang, computeVarjyam } = require("panchang-ts");

const LOCATION = { latitude: 17.3850, longitude: 78.4867 };
const TIMEZONE = 330; // IST
const TIMEZONE_LABEL = "Asia/Kolkata";

const getIstDateString = (date = new Date()) =>
  date.toLocaleDateString("en-CA", { timeZone: TIMEZONE_LABEL });

const parseQueryDate = (dateString) => {
  if (!dateString) {
    return new Date(`${getIstDateString()}T00:00:00+05:30`);
  }

  const normalized = String(dateString).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }

  return new Date(`${normalized}T00:00:00+05:30`);
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", {
    timeZone: TIMEZONE_LABEL,
    hour12: false,
  });
};

const getMoonLongitude = (dateUtc) => {
  const instant = getInstantPanchang(dateUtc, LOCATION, { timezone: TIMEZONE });
  return instant?.luna?.longitude ?? instant?.luna?.degree ?? 0;
};

const getVarjyamPeriods = (daily, nextDaily, dayStart, dayEnd) => {
  if (!Array.isArray(daily.nakshatras)) {
    return [];
  }

  return daily.nakshatras
    .map((nakshatra) => {
      const varjyam = computeVarjyam(
        nakshatra.index,
        daily.sunrise,
        nextDaily.sunrise,
        getMoonLongitude
      );

      if (!varjyam || !varjyam.start || !varjyam.end) {
        return null;
      }

      if (varjyam.end < dayStart || varjyam.start > dayEnd) {
        return null;
      }

      return {
        nakshatra: nakshatra.name || null,
        nakshatraIndex: nakshatra.index ?? null,
        pada: nakshatra.pada ?? null,
        start: formatDateTime(varjyam.start),
        end: formatDateTime(varjyam.end),
      };
    })
    .filter(Boolean);
};

const serializeEntries = (entries, fields) => {
  if (!Array.isArray(entries)) return [];

  return entries.map((entry) => {
    const result = {};
    fields.forEach((field) => {
      if (field === "startTime" || field === "endTime") {
        result[field] = formatDateTime(entry[field]);
      } else {
        result[field] = entry[field] ?? null;
      }
    });
    return result;
  });
};

const getPanchangTest = (dateString) => {
  const date = parseQueryDate(dateString);
  const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  const daily = getDailyPanchang(date, LOCATION, {
    timezone: TIMEZONE,
    language: "en",
    computeEndTimes: true,
  });

  const nextDaily = getDailyPanchang(nextDate, LOCATION, {
    timezone: TIMEZONE,
    language: "en",
    computeEndTimes: true,
  });

  const dayStart = new Date(`${getIstDateString(date)}T00:00:00+05:30`);
  const dayEnd = new Date(`${getIstDateString(date)}T23:59:59+05:30`);

  return {
    date: getIstDateString(date),
    location: LOCATION,
    timezone: "IST",
    sunrise: formatDateTime(daily.sunrise),
    sunset: formatDateTime(daily.sunset),
    tithis: serializeEntries(daily.tithis, ["name", "paksha", "startTime", "endTime"]),
    nakshatras: serializeEntries(daily.nakshatras, ["name", "index", "pada", "isActiveAtSunrise", "startTime", "endTime"]),
    yogas: serializeEntries(daily.yogas, ["name", "startTime", "endTime"]),
    karanas: serializeEntries(daily.karanas, ["name", "type", "startTime", "endTime"]),
    varjyamPeriods: getVarjyamPeriods(daily, nextDaily, dayStart, dayEnd),
  };
};

module.exports = {
  getPanchangTest,
};
