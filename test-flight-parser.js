// Test script to verify flight number extraction
// This tests the regex patterns used in the parser

function testFlightNumberExtraction() {
  // Test cases for flight numbers
  const testCases = [
    { input: 'ET64SOMEDATA', expected: 'ET64', description: 'ET64 - 2 digits' },
    { input: 'KQ555SOMEDATA', expected: 'KQ555', description: 'KQ555 - 3 digits' },
    { input: 'ET064SOMEDATA', expected: 'ET064', description: 'ET064 - leading zero' },
    { input: 'ET 64 SOMEDATA', expected: 'ET64', description: 'ET 64 - with space' },
    { input: 'KQ 555 SOMEDATA', expected: 'KQ555', description: 'KQ 555 - with space' },
    { input: 'ET0064SOMEDATA', expected: 'ET0064', description: 'ET0064 - double zero' },
    { input: '9U404SOMEDATA', expected: '9U404', description: '9U404 - Air Congo' },
    { input: 'AF123SOMEDATA', expected: 'AF123', description: 'AF123 - Air France' },
    { input: 'SN456SOMEDATA', expected: 'SN456', description: 'SN456 - Brussels Airlines' },
  ];

  console.log('Testing flight number extraction patterns:\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    // PRIORITÉ 1: KQ pattern
    const kqMatch = test.input.match(/KQ\s*0*(\d{2,4})/);
    if (kqMatch) {
      const result = `KQ${kqMatch[1]}`;
      if (result === test.expected) {
        console.log(`✅ PASS: ${test.description}`);
        console.log(`   Input: "${test.input}" → Output: "${result}"\n`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.description}`);
        console.log(`   Input: "${test.input}" → Expected: "${test.expected}", Got: "${result}"\n`);
        failed++;
      }
      continue;
    }

    // PRIORITÉ 2: Airline pattern (includes KQ in the old code)
    const airlineMatch = test.input.match(/(9U|ET|EK|AF|SN|TK|WB|SA|SR)\s*0*(\d{2,4})/);
    if (airlineMatch) {
      const result = `${airlineMatch[1]}${airlineMatch[2]}`;
      if (result === test.expected) {
        console.log(`✅ PASS: ${test.description}`);
        console.log(`   Input: "${test.input}" → Output: "${result}"\n`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.description}`);
        console.log(`   Input: "${test.input}" → Expected: "${test.expected}", Got: "${result}"\n`);
        failed++;
      }
      continue;
    }

    // PRIORITÉ 3: Generic pattern
    const genericMatch = test.input.match(/([A-Z]{2})\s*(\d{2,4})/);
    if (genericMatch) {
      const result = `${genericMatch[1]}${genericMatch[2]}`;
      if (result === test.expected) {
        console.log(`✅ PASS: ${test.description}`);
        console.log(`   Input: "${test.input}" → Output: "${result}"\n`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.description}`);
        console.log(`   Input: "${test.input}" → Expected: "${test.expected}", Got: "${result}"\n`);
        failed++;
      }
      continue;
    }

    console.log(`❌ FAIL: ${test.description}`);
    console.log(`   Input: "${test.input}" → No pattern matched\n`);
    failed++;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
}

testFlightNumberExtraction();
