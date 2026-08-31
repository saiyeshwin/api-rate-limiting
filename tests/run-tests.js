const path = require('path');
const fs = require('fs');
const newman = require('newman');
const { runRateLimitBreachTest } = require('./test-suites/rate-limit-breach.test');

const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const reportPath = path.join(reportsDir, 'index.html');
const collectionPath = path.join(__dirname, 'postman_collection.json');
const environmentPath = path.join(__dirname, 'postman_environment.json');

console.log('================================================================');
console.log('🚀 STARTING QUALITY ENGINEERING AUTOMATED TEST SUITE');
console.log('================================================================\n');

newman.run({
  collection: collectionPath,
  environment: environmentPath,
  reporters: ['cli', 'htmlextra'],
  reporter: {
    htmlextra: {
      export: reportPath,
      template: null,
      logs: true,
      testPaging: true,
      browserTitle: "API Observability QA Test Report",
      title: "API Rate Limiting & Observability Platform — Automation Test Report",
      titleSize: 2,
      omitHeaders: false,
      showMarkdownLinks: true,
      noSyntaxHighlighting: false,
      showEnvironmentData: true
    }
  }
}, async (err, summary) => {
  if (err) {
    console.error('Fatal Newman Execution Error:', err);
    process.exit(1);
  }

  const { stats, failures } = summary.run;
  
  console.log('\n----------------------------------------------------------------');
  console.log('📊 NEWMAN COLLECTION EXECUTION SUMMARY');
  console.log('----------------------------------------------------------------');
  console.log(`Total Requests Executed: ${stats.requests.total}`);
  console.log(`Total Assertions Checked: ${stats.assertions.total}`);
  console.log(`Passed Assertions:       ${stats.assertions.total - stats.assertions.failed}`);
  console.log(`Failed Assertions:       ${stats.assertions.failed}`);
  console.log(`HTML Test Report Saved:  ${reportPath}`);
  console.log('----------------------------------------------------------------\n');

  if (failures && failures.length > 0) {
    console.error('❌ Failed Test Cases in Collection:');
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. [${f.source.name}] -> ${f.error.test}: ${f.error.message}`);
    });
  }

  // Next: Run Dedicated 101-Requests Rate Limit Breach Test
  console.log('Running Step 2: High-Volume Rate Limit Breach (101 requests benchmark)...');
  const breachTestPassed = await runRateLimitBreachTest();

  console.log('================================================================');
  console.log('🏁 FINAL TEST SUITE RESULTS');
  console.log('================================================================');
  
  const allPassed = (stats.assertions.failed === 0) && breachTestPassed;

  if (allPassed) {
    console.log('🎉 STATUS: ALL TESTS PASSED (100% SUCCESS RATE)');
    console.log(`📁 Detailed Interactive HTML Report: ${reportPath}`);
    process.exit(0);
  } else {
    console.error('❌ STATUS: TEST SUITE ENCOUNTERED FAILURES');
    process.exit(1);
  }
});
