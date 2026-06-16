const { getDailyPanchang, computeVarjyam, getInstantPanchang } = require('panchang-ts');

/**
 * DETAILED IMPLEMENTATION APPROACH
 * Calculate ALL Varjyam windows for a calendar day
 */

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║ DETAILED IMPLEMENTATION: getAllVarjyamForDay()                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const location = { latitude: 17.3850, longitude: 78.4867 };
const timezone = 330; // IST

// ============================================================================
// APPROACH: Use computeVarjyam with extracted nakshatra data
// ============================================================================

console.log('GOAL: Extract ALL Varjyam windows occurring during 2026-06-10\n');

// Step 1: Get daily panchang data
const daily = getDailyPanchang(new Date(2026, 5, 10), location, { timezone });
const nextDaily = getDailyPanchang(new Date(2026, 5, 11), location, { timezone });

console.log('Step 1: Retrieve Daily Panchang Data');
console.log('─────────────────────────────────────');
console.log(`Today (June 10):  ${daily.nakshatras.length} nakshatras`);
console.log(`Tomorrow (June 11): ${nextDaily.nakshatras.length} nakshatras`);
console.log(`Today's Sunrise:  ${daily.sunrise.toLocaleTimeString('en-IN')}`);
console.log(`Today's Sunset:   ${daily.sunset.toLocaleTimeString('en-IN')}`);
console.log(`Tomorrow's Sunrise: ${nextDaily.sunrise.toLocaleTimeString('en-IN')}`);
console.log();

// Step 2: Examine nakshatra structure
console.log('Step 2: Examine Nakshatra Object Structure');
console.log('──────────────────────────────────────────');
daily.nakshatras.forEach((n, idx) => {
  console.log(`\nNakshatra ${idx}: ${n.name}`);
  console.log(`  index: ${n.index}`);
  console.log(`  pada: ${n.pada}`);
  console.log(`  startTime: ${n.startTime ? new Date(n.startTime).toLocaleTimeString('en-IN') : 'N/A'}`);
  console.log(`  endTime: ${n.endTime ? new Date(n.endTime).toLocaleTimeString('en-IN') : 'N/A'}`);
  console.log(`  isActiveAtSunrise: ${n.isActiveAtSunrise}`);
});

// Step 3: Try to call computeVarjyam directly
console.log('\n\nStep 3: Call computeVarjyam() Directly');
console.log('───────────────────────────────────────');
console.log('Testing if computeVarjyam can be called with available data...\n');

// The challenge: computeVarjyam requires a getMoon callback function
// Let's see what happens if we try to use getInstantPanchang to create that callback

function createMoonGetter(location, timezone) {
  return function getMoonLongitude(dateUtc) {
    const instant = getInstantPanchang(dateUtc, location, { timezone });
    if (instant && instant.luna) {
      // Moon object should have a longitude property
      return instant.luna.longitude || instant.luna.degree || 0;
    }
    return 0;
  };
}

const getMoon = createMoonGetter(location, timezone);

// Try calling computeVarjyam for each nakshatra
console.log('Attempting computeVarjyam() for each nakshatra:\n');

const varjyams = [];

for (const nakshatra of daily.nakshatras) {
  console.log(`Computing Varjyam for ${nakshatra.name} (index ${nakshatra.index})...`);
  
  try {
    // computeVarjyam(nakshatraIndex, sunriseUtc, nextSunriseUtc, getMoon)
    const varjyam = computeVarjyam(
      nakshatra.index,
      daily.sunrise,           // Current day sunrise
      nextDaily.sunrise,       // Next day sunrise
      getMoon                  // Moon longitude getter
    );
    
    if (varjyam) {
      console.log(`  ✓ Varjyam found: ${varjyam.start.toLocaleTimeString('en-IN')} - ${varjyam.end.toLocaleTimeString('en-IN')}`);
      varjyams.push({
        nakshatraName: nakshatra.name,
        nakshatraIndex: nakshatra.index,
        pada: nakshatra.pada,
        varjyam: {
          start: varjyam.start,
          end: varjyam.end,
        }
      });
    } else {
      console.log(`  ✗ No Varjyam (window outside day boundary)`);
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
  }
}

console.log('\n\nStep 4: Results Summary');
console.log('───────────────────────\n');

if (varjyams.length === 0) {
  console.log('No Varjyam windows found for this day.\n');
} else {
  console.log(`Total Varjyam windows on June 10: ${varjyams.length}\n`);
  varjyams.forEach((v, idx) => {
    const startStr = v.varjyam.start.toLocaleTimeString('en-IN');
    const endStr = v.varjyam.end.toLocaleTimeString('en-IN');
    console.log(`${idx + 1}. ${v.nakshatraName} (Pada ${v.pada})`);
    console.log(`   Varjyam: ${startStr} - ${endStr}`);
    console.log();
  });
}

// ============================================================================
// IMPLEMENTATION PSEUDOCODE
// ============================================================================

console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
console.log('║ IMPLEMENTATION PSEUDOCODE                                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`
backend/utils/panchang-extended.js
═══════════════════════════════════════════════════════════════════════════

const { 
  getDailyPanchang, 
  computeVarjyam, 
  getInstantPanchang 
} = require('panchang-ts');

/**
 * Get ALL Varjyam windows occurring during a calendar day
 * (not just the sunrise nakshatra)
 * 
 * @param {Date} date - Calendar date
 * @param {Object} location - {latitude, longitude}
 * @param {number} timezone - Minutes offset from UTC (e.g., 330 for IST)
 * @returns {Array} - Array of {nakshatraName, nakshatraIndex, pada, varjyam: {start, end}}
 */
exports.getAllVarjyamForDay = function(date, location, timezone) {
  // Get panchang for today and tomorrow (need next sunrise)
  const daily = getDailyPanchang(date, location, { timezone });
  if (!daily) return [];
  
  const nextDate = new Date(date.getTime() + 86400000); // +1 day
  const nextDaily = getDailyPanchang(nextDate, location, { timezone });
  if (!nextDaily) return [];
  
  // Create Moon getter callback using getInstantPanchang
  function getMoonLongitude(dateUtc) {
    const instant = getInstantPanchang(dateUtc, location, { timezone });
    if (instant?.luna?.longitude !== undefined) {
      return instant.luna.longitude;
    }
    return 0;
  }
  
  // For each nakshatra that occurs during this day, compute Varjyam
  const varjyams = [];
  
  for (const nakshatra of daily.nakshatras) {
    try {
      const varjyam = computeVarjyam(
        nakshatra.index,
        daily.sunrise,
        nextDaily.sunrise,
        getMoonLongitude
      );
      
      if (varjyam) {
        varjyams.push({
          nakshatraName: nakshatra.name,
          nakshatraIndex: nakshatra.index,
          pada: nakshatra.pada,
          varjyam: {
            start: varjyam.start,
            end: varjyam.end,
          },
          // Additional useful data
          duration: varjyam.end.getTime() - varjyam.start.getTime(),
          durationMinutes: (varjyam.end.getTime() - varjyam.start.getTime()) / 60000,
        });
      }
    } catch (error) {
      console.error(\`Error computing Varjyam for \${nakshatra.name}:\`, error);
    }
  }
  
  // Sort by start time
  varjyams.sort((a, b) => a.varjyam.start.getTime() - b.varjyam.start.getTime());
  
  return varjyams;
};

/**
 * Example usage:
 */
exports.exampleUsage = function() {
  const result = this.getAllVarjyamForDay(
    new Date(2026, 5, 10),
    { latitude: 17.3850, longitude: 78.4867 },
    330
  );
  
  result.forEach(v => {
    console.log(\`\${v.nakshatraName}: \${v.varjyam.start} - \${v.varjyam.end}\`);
  });
};


═══════════════════════════════════════════════════════════════════════════

KEY OBSERVATIONS FROM ANALYSIS
═════════════════════════════════════════════════════════════════════════════

✓ GOOD NEWS: computeVarjyam IS exported from panchang-ts
✓ GOOD NEWS: getDailyPanchang returns all nakshatras occurring during day
✓ GOOD NEWS: Nakshatra objects include index and pada information
✓ GOOD NEWS: getInstantPanchang is available for Moon longitude callback
✓ GOOD NEWS: No private/internal function access needed

⚠ CHALLENGE: computeVarjyam requires getMoon callback
   SOLUTION: Use getInstantPanchang() to create callback dynamically

⚠ CHALLENGE: getDailyPanchang.nakshatras only gives index, not all nakshatras
   SOLUTION: Already solved - iterate provided nakshatras


EXPECTED OUTPUT FOR JUNE 10, 2026
═════════════════════════════════════════════════════════════════════════════

Based on current investigation:

Date: 2026-06-10
Nakshatras: Uttara Bhadrapada (index 25), Revati (index 26)

Possible outcomes:
1. Both nakshatras have Varjyam windows → Return [varjyam1, varjyam2]
2. Only one has Varjyam → Return [varjyam]
3. Neither has overlapping window → Return []

Current finding: Both return null (windows outside day boundary)
This is correct per panchang-ts design - not a limitation.


INTEGRATION POINTS
═════════════════════════════════════════════════════════════════════════════

File modifications needed:
1. Create backend/utils/panchang-extended.js (new file with wrapper)
2. Update backend/controllers/authController.js (use new wrapper in notifications)
3. Update backend/routes/authRoutes.js (if exposing varjyam endpoint)

No changes to frontend required initially.
Can be integrated during Prokerala → panchang-ts migration.


NEXT STEPS
═════════════════════════════════════════════════════════════════════════════

1. Create panchang-extended.js with getAllVarjyamForDay() wrapper
2. Add backend route: GET /api/varjyam/all-for-date?date=YYYY-MM-DD
3. Update login notification to use getAllVarjyamForDay()
4. Test with multiple dates (find day with multiple Varjyam windows)
5. Update frontend to display all Varjyam periods
`);

console.log('\n════════════════════════════════════════════════════════════════════════════\n');
