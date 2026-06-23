const { getDailyPanchang, getInstantPanchang, computeVarjyam } = require("panchang-ts");

const LOCATION = { latitude: 17.3850, longitude: 78.4867 };
const TIMEZONE = 330; // IST (UTC+5:30)
const TIMEZONE_LABEL = "Asia/Kolkata";

/**
 * Get IST date string (YYYY-MM-DD)
 */
const getIstDateString = (date = new Date()) =>
  date.toLocaleDateString("en-CA", { timeZone: TIMEZONE_LABEL });

/**
 * Parse date string to Date object at midnight IST
 */
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

/**
 * Format date/time to locale string
 */
const formatDateTime = (value) => {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;

  const pad = (value) => String(value).padStart(2, "0");
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
 * Get moon longitude at a given UTC time (for Varjyam computation)
 */
const getMoonLongitude = (dateUtc) => {
  try {
    const instant = getInstantPanchang(dateUtc, LOCATION, { timezone: TIMEZONE });
    return instant?.luna?.longitude ?? instant?.luna?.degree ?? 0;
  } catch {
    return 0;
  }
};

/**
 * Calculate all Varjyam periods for a given day (00:00-23:59 IST)
 * 
 * Note: panchang-ts computeVarjyam() returns very short periods (2 seconds)
 * at sunrise/sunset boundaries. These are technically correct but not useful
 * for practical application. Returning empty array until proper implementation.
 * 
 * Returns array of all Varjyam periods that occur within the day
 */
const getVarjyamPeriodsForDay = (queryDate) => {
  try {
    const daily = getDailyPanchang(queryDate, LOCATION, {
      timezone: TIMEZONE,
      language: "en",
      computeEndTimes: true,
    });

    if (!daily || !daily.sunrise || !Array.isArray(daily.nakshatras)) {
      return [];
    }

    const nextDate = new Date(queryDate.getTime() + 24 * 60 * 60 * 1000);
    const nextDaily = getDailyPanchang(nextDate, LOCATION, {
      timezone: TIMEZONE,
      language: "en",
      computeEndTimes: true,
    });

    if (!nextDaily || !nextDaily.sunrise) {
      return [];
    }

    const panchangDate = getIstDateString(daily.sunrise);
    const varjyams = [];

    for (const nakshatra of daily.nakshatras) {
      try {
        const varjyam = computeVarjyam(
          nakshatra.index,
          daily.sunrise,
          nextDaily.sunrise,
          getMoonLongitude
        );

        if (!varjyam || !varjyam.start || !varjyam.end) {
          continue;
        }

        const startIso = formatDateTime(varjyam.start);
        const endIso = formatDateTime(varjyam.end);
        const actualDate = getIstDateString(varjyam.start);
        const label = actualDate !== panchangDate ? "Next Day Early Morning Varjyam" : null;

        varjyams.push({
          name: "Varjyam",
          nakshatra: nakshatra.name,
          pada: nakshatra.pada,
          start: startIso,
          end: endIso,
          actualDate,
          panchangDate,
          label,
        });
      } catch (error) {
        console.warn(`Unable to compute Varjyam for nakshatra ${nakshatra?.name}:`, error.message);
      }
    }

    return varjyams.sort((a, b) => new Date(a.start) - new Date(b.start));
  } catch (error) {
    console.error("Error calculating Varjyam periods:", error.message);
    return [];
  }
};

/**
 * Get Tithi data for a given date and time
 * Returns tithi info matching Prokerala format
 */
const getTithiData = (queryDate, queryTime) => {
  try {
    const dateTimeString = `${getIstDateString(queryDate)}T${queryTime}:00+05:30`;
    const queryDateTime = new Date(dateTimeString);

    const daily = getDailyPanchang(queryDate, LOCATION, {
      timezone: TIMEZONE,
      language: "en",
      computeEndTimes: true,
    });

    if (!daily || !Array.isArray(daily.tithis) || daily.tithis.length === 0) {
      return null;
    }

    const parseTimeValue = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    // Find the tithi that includes the query time
    let currentTithi = null;
    for (const tithi of daily.tithis) {
      const tithiEnd = parseTimeValue(tithi.endTime || tithi.end);
      const tithiStart = parseTimeValue(tithi.startTime || tithi.start);
      if (!tithiEnd) {
        continue;
      }

      if (queryDateTime >= (tithiStart || new Date(-8640000000000000)) && queryDateTime < tithiEnd) {
        currentTithi = tithi;
        break;
      }
    }

    // If no tithi found (shouldn't happen), use first tithi
    if (!currentTithi) {
      currentTithi = daily.tithis[0];
    }

    return {
      name: currentTithi.name,
      paksha: currentTithi.paksha,
      completionPercentage: currentTithi.completionPercentage,
      startTime: currentTithi.startTime,
      endTime: currentTithi.endTime,
    };
  } catch (error) {
    console.error("Error calculating Tithi data:", error.message);
    return null;
  }
};

/**
 * Get all panchang data using panchang-ts for a given date
 * Used to build response for API endpoints
 */
const getPanchangData = (queryDate, queryTime) => {
  try {
    const daily = getDailyPanchang(queryDate, LOCATION, {
      timezone: TIMEZONE,
      language: "en",
      computeEndTimes: true,
    });

    if (!daily) {
      return null;
    }

    const tithiData = getTithiData(queryDate, queryTime);
    const todayVarjyamDetails = getVarjyamPeriodsForDay(queryDate);

    const previousDate = new Date(queryDate.getTime() - 24 * 60 * 60 * 1000);
    const previousVarjyamDetails = getVarjyamPeriodsForDay(previousDate).filter(
      (item) => item.actualDate === getIstDateString(queryDate)
    );

    return {
      tithi: tithiData,
      tithis: daily.tithis,
      nakshatras: daily.nakshatras,
      yogas: daily.yogas,
      karanas: daily.karanas,
      sunrise: daily.sunrise,
      sunset: daily.sunset,
      varjyamDetails: [...todayVarjyamDetails, ...previousVarjyamDetails],
    };
  } catch (error) {
    console.error("Error getting panchang data:", error.message);
    return null;
  }
};

module.exports = {
  parseQueryDate,
  formatDateTime,
  getTithiData,
  getVarjyamPeriodsForDay,
  getPanchangData,
  getIstDateString,
  LOCATION,
  TIMEZONE,
  TIMEZONE_LABEL,
};
