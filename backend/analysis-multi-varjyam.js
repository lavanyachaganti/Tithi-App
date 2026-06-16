const { getDailyPanchang, getInstantPanchang } = require('panchang-ts');

/**
 * ANALYSIS: Calculate ALL Varjyam windows for a day (not just sunrise nakshatra)
 * 
 * Goal: Match traditional panchang behavior where all Varjyam periods 
 * occurring during a calendar day are shown.
 * 
 * Approach: 
 * 1. Find all nakshatra transitions during the day (00:00 - 23:59 local time)
 * 2. Calculate Varjyam for each nakshatra that occurs during the day
 * 3. Return all overlapping Varjyam windows
 */

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║ ANALYSIS: Multi-Varjyam Extraction from panchang-ts           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const location = { latitude: 17.3850, longitude: 78.4867 };
const timezone = 330; // IST

console.log('Test Date: 2026-06-10');
console.log(`Location: ${location.latitude}°, ${location.longitude}°`);
console.log(`Timezone: IST (UTC+${timezone / 60})\n`);

// ============================================================================
// STEP 1: Explore getDailyPanchang output structure
// ============================================================================

console.log('─────────────────────────────────────────────────────────────────');
console.log('STEP 1: Examine getDailyPanchang Output');
console.log('─────────────────────────────────────────────────────────────────\n');

const daily = getDailyPanchang(new Date(2026, 5, 10), location, { timezone, language: 'en' });

console.log('Daily Result Structure:');
console.log(`  sunrise: ${daily.sunrise.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
console.log(`  sunset: ${daily.sunset.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
console.log(`  Nakshatras count: ${daily.nakshatras.length}`);
console.log(`  Tithis count: ${daily.tithis.length}`);
console.log(`  Yogas count: ${daily.yogas.length}`);

console.log('\nNakshatras:');
daily.nakshatras.forEach((n, i) => {
  console.log(`  ${i}. ${n.name.padEnd(20)} (index: ${n.index || '?'})`);
  console.log(`     Properties: ${Object.keys(n).join(', ')}`);
});

// ============================================================================
// STEP 2: Check if getInstantPanchang exposes nakshatra index or access to compute
// ============================================================================

console.log('\n─────────────────────────────────────────────────────────────────');
console.log('STEP 2: Test getInstantPanchang at Different Times');
console.log('─────────────────────────────────────────────────────────────────\n');

const testTimes = [
  '2026-06-10T00:00:00',  // Midnight
  '2026-06-10T06:00:00',  // 6 AM
  '2026-06-10T12:00:00',  // Noon
  '2026-06-10T18:00:00',  // 6 PM
  '2026-06-10T23:59:00',  // 11:59 PM
];

const instantResults = [];

testTimes.forEach(isoTime => {
  const date = new Date(isoTime + '+05:30'); // Convert to UTC
  const instant = getInstantPanchang(date, location, { timezone, language: 'en' });
  
  if (instant) {
    instantResults.push({
      time: isoTime.split('T')[1],
      nakshatra: instant.nakshatra.name,
      nakshatraIndex: instant.nakshatra.index,
      tithi: instant.tithi.name,
    });
  }
});

console.log('Instant Panchang Results (all have nakshatra.index):');
instantResults.forEach(r => {
  console.log(`  ${r.time}: ${r.nakshatra.padEnd(20)} (index: ${r.nakshatraIndex})`);
});

// ============================================================================
// STEP 3: Identify nakshatra transitions during the day
// ============================================================================

console.log('\n─────────────────────────────────────────────────────────────────');
console.log('STEP 3: Identify Nakshatra Transitions');
console.log('─────────────────────────────────────────────────────────────────\n');

const dayStart = new Date('2026-06-10T00:00:00+05:30');
const dayEnd = new Date('2026-06-10T23:59:59+05:30');

console.log(`Scanning for nakshatras active during calendar day...`);
console.log(`Day boundaries: ${dayStart.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} - ${dayEnd.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`);

// Instead of relying on getDailyPanchang.nakshatras timing info,
// sample getInstantPanchang every few hours to detect all nakshatras
const samplingTimes = [];
const currentDate = new Date('2026-06-10T00:00:00');
for (let hour = 0; hour < 24; hour++) {
  const sampleTime = new Date(currentDate.getTime() + hour * 3600000);
  samplingTimes.push(sampleTime);
}

console.log(`Sampling getInstantPanchang every hour (00:00 - 23:00 IST):\n`);

const nakshatrasByIndex = {};
const nakshatraSequence = [];

samplingTimes.forEach(time => {
  const instant = getInstantPanchang(time, location, { timezone });
  if (instant && instant.nakshatra) {
    const timeStr = time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
    const nakName = instant.nakshatra.name;
    const nakIndex = instant.nakshatra.index;
    
    // Track index->name mapping
    if (!nakshatrasByIndex[nakIndex]) {
      nakshatrasByIndex[nakIndex] = nakName;
      nakshatraSequence.push({ index: nakIndex, name: nakName, time: timeStr });
      console.log(`  ${timeStr}: ${nakName.padEnd(20)} (index: ${nakIndex})`);
    }
  }
});

console.log(`\nUnique nakshatras found during day: ${Object.keys(nakshatrasByIndex).length}`);
console.log('Indexes:', Object.keys(nakshatrasByIndex).join(', '));

// ============================================================================
// STEP 4: Explore Internal APIs
// ============================================================================

console.log('─────────────────────────────────────────────────────────────────');
console.log('STEP 4: Explore panchang-ts Internal APIs');
console.log('─────────────────────────────────────────────────────────────────\n');

console.log('Available exports from panchang-ts:');

// Check what's available
const panchangTs = require('panchang-ts');
const computeFunctions = Object.keys(panchangTs).filter(k => k.startsWith('compute'));
console.log(`\nCompute functions (${computeFunctions.length} total):`);
computeFunctions.slice(0, 15).forEach(f => console.log(`  • ${f}`));
if (computeFunctions.length > 15) {
  console.log(`  ... and ${computeFunctions.length - 15} more`);
}

// Check for varjyam-specific functions
const varjyamFunctions = computeFunctions.filter(f => f.toLowerCase().includes('varjyam'));
console.log(`\nVarjyam-related exports: ${varjyamFunctions.length}`);
varjyamFunctions.forEach(f => console.log(`  • ${f}`));

// ============================================================================
// STEP 5: Implementation Strategy
// ============================================================================

console.log('\n─────────────────────────────────────────────────────────────────');
console.log('STEP 5: Implementation Approach');
console.log('─────────────────────────────────────────────────────────────────\n');

console.log(`
PROPOSED SOLUTION: Wrapper Function
════════════════════════════════════════════════════════════════════════════

Option A: Leverage getDailyPanchang().nakshatras + Manual Loop
─────────────────────────────────────────────────────────────

function getAllVarjyamForDay(date, location, options = {}) {
  const daily = getDailyPanchang(date, location, options);
  if (!daily) return null;
  
  const varjyams = [];
  
  // Iterate each nakshatra that occurs during this day
  for (const nakshatra of daily.nakshatras) {
    // Access private/internal computeVarjyam() somehow
    // Problem: computeVarjyam is not exported directly
    
    const varjyam = computeVarjyam(
      nakshatra.index,
      daily.sunrise,
      daily.sunset,  // or next day's sunrise
      getMoonLongitude  // Need access to this internal function
    );
    
    if (varjyam) {
      varjyams.push({
        nakshatra: nakshatra.name,
        nakshatraIndex: nakshatra.index,
        varjyam: varjyam,
      });
    }
  }
  
  return varjyams;
}

PROBLEM: computeVarjyam is NOT exported in the public API
       → Would need to import from source or duplicate logic


Option B: Extend During Backend Integration (Recommended)
──────────────────────────────────────────────────────────

Create wrapper at backend layer:

File: backend/utils/panchang-extended.js

const { getDailyPanchang, computeVarjyam } = require('panchang-ts');

exports.getAllVarjyamForDay = function(date, location, timezone) {
  // 1. Get daily panchang
  const daily = getDailyPanchang(date, location, { timezone });
  if (!daily) return [];
  
  // 2. For each nakshatra index in nakshatras array, compute Varjyam
  const varjyams = [];
  
  for (const nakshatra of daily.nakshatras) {
    try {
      // computeVarjyam requires getMoon function (internal API)
      // Workaround: Use getInstantPanchang at nakshatra.start 
      // to get Moon longitude, pass getter function
      
      const instant = getInstantPanchang(nakshatra.start, location, { timezone });
      // Extract needed data...
    } catch (e) {
      // computeVarjyam may not be exported
    }
  }
  
  return varjyams;
};


Option C: Work-Around (No Internal API Access Required)
───────────────────────────────────────────────────────

If computeVarjyam is private, implement workaround:

1. Use getInstantPanchang() at sunrise
2. Observe varjyam field
3. Identify start/end times
4. Call getInstantPanchang() in 1-minute intervals to find transitions
5. Build varjyam list from observations (slower, but works offline)


CURRENT BLOCKERS
════════════════════════════════════════════════════════════════════════════

1. computeVarjyam() is NOT exported
   Status: Would need source code inspection or duplicate implementation
   
2. getMoon() internal function (for computing sidereal Moon longitude)
   Status: May not be exported; need to check if alternative API exists
   
3. Next day's sunrise time (for day boundary calculation)
   Status: Need to query getDailyPanchang() for next day


INVESTIGATION NEEDED
════════════════════════════════════════════════════════════════════════════

✓ Check if computeVarjyam is exported (via \`require('panchang-ts')\`)
✓ Check TypeScript definitions for hidden exports
✓ Check if internals can be accessed via barrel export
✓ Review panchang-ts source repository for extension points
✓ Determine if library supports "plugin" or "extension" pattern
`);

// ============================================================================
// STEP 6: API Export Check
// ============================================================================

console.log('─────────────────────────────────────────────────────────────────');
console.log('STEP 6: Check What\'s Actually Exported');
console.log('─────────────────────────────────────────────────────────────────\n');

// Try to access computeVarjyam directly
try {
  const { computeVarjyam } = require('panchang-ts');
  console.log('✓ computeVarjyam IS exported!');
  console.log(`  Type: ${typeof computeVarjyam}`);
} catch (e) {
  console.log('✗ computeVarjyam NOT directly exported');
  console.log(`  Error: ${e.message}`);
}

// Check other internal functions
const internalFuncs = ['getMoonrise', 'getMoonset', 'computeInstantPanchang'];
console.log('\nChecking other potentially-internal functions:');
internalFuncs.forEach(func => {
  try {
    const mod = require('panchang-ts');
    if (func in mod) {
      console.log(`  ✓ ${func} is exported`);
    } else {
      console.log(`  ✗ ${func} not found`);
    }
  } catch (e) {
    console.log(`  ✗ ${func} - error: ${e.message}`);
  }
});

console.log('\n════════════════════════════════════════════════════════════════════════════\n');
