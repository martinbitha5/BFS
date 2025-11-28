// Test script pour vérifier l'extraction PNR
const data1 = "M1EYAKOLI/BALA MARIE EEMXTRJE FIHGMAET 0072 228Y021A0083 377>8321OO5228BET 9071433689001                          2A0712154453805 1ET                        N*30601030K0900";
const data2 = "M1MASIMANGO/ISSIAKA GREOIFLBU FIHMDKET 0080 235Y031J0095 177>8321OO5235BET                                        2A0712154800800 1ET                        N*306      0900";

console.log("Test 1: EYAKOLI/BALA MARIE");
console.log("Data:", data1);
console.log("Looking for pattern: \\s([A-Z]{7,9})\\s+[A-Z]");

const patternFlexible = /\s([A-Z]{7,9})\s+[A-Z]/g;
const matches1 = Array.from(data1.matchAll(patternFlexible));
console.log("Matches:", matches1.map(m => m[1]));

matches1.forEach(m => {
  const letters = m[1];
  console.log(`  Letters: "${letters}" (length: ${letters.length})`);
  for (let dispersal = 1; dispersal <= 4; dispersal++) {
    if (dispersal + 6 <= letters.length) {
      const pnr = letters.substring(dispersal, dispersal + 6);
      console.log(`    ${dispersal}+6: dispersal="${letters.substring(0, dispersal)}", pnr="${pnr}"`);
    }
  }
});

console.log("\n\nTest 2: MASIMANGO/ISSIAKA");
console.log("Data:", data2);

const matches2 = Array.from(data2.matchAll(patternFlexible));
console.log("Matches:", matches2.map(m => m[1]));

matches2.forEach(m => {
  const letters = m[1];
  console.log(`  Letters: "${letters}" (length: ${letters.length})`);
  for (let dispersal = 1; dispersal <= 4; dispersal++) {
    if (dispersal + 6 <= letters.length) {
      const pnr = letters.substring(dispersal, dispersal + 6);
      console.log(`    ${dispersal}+6: dispersal="${letters.substring(0, dispersal)}", pnr="${pnr}"`);
    }
  }
});
