/**
 * Deep investigation of panchang-ts Varjyam calculation
 * Target: Find why 8:49 PM–10:20 PM Varjyam on 2026-06-10 is not returned
 */

const {
  getDailyPanchang,
  getInstantPanchang,
  computeVarjyam,
  getMoonLongitude,
} = require("panchang-ts");

const LOCATION = { latitude: 17.3850, longitude: 78.4867 }; // Hyderabad
const TIMEZONE = 330; // IST UTC+5:30
const TEST_DATE = new Date("2026-06-10T00:00:00+05:30");

console.log("=".repeat(80));
console.log("VARJYAM INVESTIGATION: June 10, 2026 (Hyderabad)");
console.log("Expected from published Panchangam: ~8:49 PM–10:20 PM (20:49–22:20 IST)");
console.log("=".repeat(80));

// Get daily panchang for test date
const daily = getDailyPanchang(TEST_DATE, LOCATION, {
  timezone: TIMEZONE,
  language: "en",
  computeEndTimes: true,
});

console.log("\n1. DAILY PANCHANG STRUCTURE");
console.log("-".repeat(80));
console.log("Properties in daily object:", Object.keys(daily).sort());

console.log("\n2. SUNRISE/SUNSET");
console.log("-".repeat(80));
console.log(`Sunrise (UTC): ${new Date(daily.sunrise).toISOString()}`);
console.log(`Sunset (UTC): ${new Date(daily.sunset).toISOString()}`);

// Convert to IST for readability
const sunriseIST = new Date(daily.sunrise.getTime() + 5.5 * 3600 * 1000);
const sunsetIST = new Date(daily.sunset.getTime() + 5.5 * 3600 * 1000);
console.log(`Sunrise (IST): ${sunriseIST.toISOString()}`);
console.log(`Sunset (IST): ${sunsetIST.toISOString()}`);

// Check tithi
console.log("\n3. TITHI DATA");
console.log("-".repeat(80));
if (daily.tithi) {
  console.log(`Tithi: ${daily.tithi.name || JSON.stringify(daily.tithi)}`);
} else {
  console.log("No tithi found");
}

// List tithis array if it exists
if (daily.tithis && Array.isArray(daily.tithis)) {
  console.log(`Tithis array length: ${daily.tithis.length}`);
  daily.tithis.forEach((t, idx) => {
    console.log(
      `  ${idx}. ${t.name} | Start: ${new Date(t.startTime).toISOString()} | End: ${new Date(t.endTime).toISOString()}`
    );
  });
}

// List all nakshatras for the day
console.log("\n4. NAKSHATRAS FOR THE DAY");
console.log("-".repeat(80));
if (Array.isArray(daily.nakshatras)) {
  console.log(`Total nakshatras: ${daily.nakshatras.length}`);
  daily.nakshatras.forEach((nak, idx) => {
    const startTime = new Date(nak.startTime);
    const endTime = new Date(nak.endTime);
    const durationMin = (nak.endTime - nak.startTime) / (1000 * 60);
    console.log(
      `${idx}. ${nak.name} (Index: ${nak.index}, Pada: ${nak.pada}) | Duration: ${durationMin.toFixed(0)}min | Start: ${startTime.toISOString().slice(11, 19)} | End: ${endTime.toISOString().slice(11, 19)}`
    );
  });
}

// Get next day's panchang for computeVarjyam reference
const nextDate = new Date(TEST_DATE.getTime() + 24 * 60 * 60 * 1000);
const nextDaily = getDailyPanchang(nextDate, LOCATION, {
  timezone: TIMEZONE,
  language: "en",
  computeEndTimes: true,
});

console.log("\n5. TESTING computeVarjyam() FOR EACH NAKSHATRA");
console.log("-".repeat(80));

if (Array.isArray(daily.nakshatras)) {
  daily.nakshatras.forEach((nakshatra) => {
    try {
      const varjyam = computeVarjyam(
        nakshatra.index,
        daily.sunrise,
        nextDaily.sunrise,
        getMoonLongitude
      );

      if (varjyam && varjyam.start && varjyam.end) {
        const startIST = new Date(varjyam.start);
        const endIST = new Date(varjyam.end);
        const durationSeconds = (varjyam.end - varjyam.start) / 1000;
        const durationMinutes = durationSeconds / 60;

        // Check if this overlaps with expected 8:49 PM–10:20 PM
        const expectedStart = new Date("2026-06-10T20:49:00+05:30");
        const expectedEnd = new Date("2026-06-10T22:20:00+05:30");
        const isInRange =
          varjyam.start >= expectedStart && varjyam.end <= expectedEnd;

        console.log(`\n  Nakshatra ${nakshatra.index}: ${nakshatra.name}`);
        console.log(`    Varjyam Start: ${startIST.toISOString()}`);
        console.log(`    Varjyam End:   ${endIST.toISOString()}`);
        console.log(
          `    Duration: ${durationSeconds.toFixed(1)} seconds (${durationMinutes.toFixed(2)} minutes)`
        );
        console.log(`    In Expected Range (20:49–22:20)? ${isInRange ? "✓" : "✗"}`);
      }
    } catch (error) {
      console.log(
        `  Nakshatra ${nakshatra.index}: ${nakshatra.name} - ERROR: ${error.message}`
      );
    }
  });
}

// Let's try getInstantPanchang at different times throughout the day
console.log("\n6. INSTANT PANCHANG AT KEY TIMES (Especially 20:49–22:20)");
console.log("-".repeat(80));

const keyTimes = [
  "2026-06-10T20:49:00+05:30", // Start of expected Varjyam
  "2026-06-10T21:34:30+05:30", // Middle of expected Varjyam
  "2026-06-10T22:20:00+05:30", // End of expected Varjyam
];

keyTimes.forEach((timeStr) => {
  const instant = getInstantPanchang(new Date(timeStr), LOCATION, {
    timezone: TIMEZONE,
    language: "en",
  });

  console.log(`\n  Time: ${timeStr}`);
  console.log(`    Nakshatra: ${instant.nakshatra.name} (Index: ${instant.nakshatra.index})`);
  console.log(`    Tithi: ${instant.tithi?.name || "N/A"}`);
  console.log(`    Yoga: ${instant.yoga?.name || "N/A"}`);
  console.log(`    Karana: ${instant.karana?.name || "N/A"}`);
});

// Investigate properties that might contain Varjyam-like data
console.log("\n7. CHECKING FOR VARJYAM-LIKE PROPERTIES");
console.log("-".repeat(80));
const allProps = Object.keys(daily);
const varjyamRelated = allProps.filter(
  (p) =>
    p.toLowerCase().includes("varjyam") ||
    p.toLowerCase().includes("auspicious") ||
    p.toLowerCase().includes("inauspicious") ||
    p.toLowerCase().includes("muhurta")
);
console.log("Varjyam-related properties found:", varjyamRelated);
varjyamRelated.forEach((prop) => {
  console.log(`  ${prop}:`, daily[prop]);
});

console.log("\n8. ROOT CAUSE ANALYSIS");
console.log("-".repeat(80));
console.log(`
computeVarjyam() implementation analysis:
- It's computing Varjyam boundaries per nakshatra
- It takes: nakshatra index, sunrise, next sunrise, moon longitude function
- Returns: {start, end} for that nakshatra's Varjyam
- Problem: Returns 2-second periods at sunrise/sunset boundaries

This suggests:
1. computeVarjyam() may be computing the transition points of nakshatras, not actual Varjyam
2. Or it's using an incomplete algorithm that only finds sunrise/sunset overlaps
3. Or Varjyam in panchang-ts means something different than traditional definition

Traditional Varjyam definition:
- Occurs during specific nakshatras' nakshatra-hour duration
- Typically lasts 90-120 minutes (1.5-2 hours)
- Related to auspicious/inauspicious periods in the day
- On June 10, 2026, should show 8:49 PM–10:20 PM (~91 minutes)

Hypothesis:
- panchang-ts computeVarjyam() computes when the nakshatra boundaries align with sunrise/sunset
- It's NOT computing the full Varjyam period for a nakshatra that spans the entire day
- The library might need a different approach or additional calculation
`);
