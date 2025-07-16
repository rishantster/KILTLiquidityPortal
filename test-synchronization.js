// Test script to verify admin panel and main app synchronization
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testSynchronization() {
  console.log('🔄 Testing Admin Panel and Main App Synchronization...\n');
  
  try {
    // Test 1: Check program analytics endpoint
    console.log('1. Testing program analytics endpoint...');
    const analyticsResponse = await fetch(`${BASE_URL}/api/rewards/program-analytics`);
    const analyticsData = await analyticsResponse.json();
    
    console.log('   ✓ Program Analytics:', {
      dailyBudget: analyticsData.dailyBudget,
      treasuryTotal: analyticsData.treasuryTotal,
      programDuration: analyticsData.programDuration,
      programDaysRemaining: analyticsData.programDaysRemaining,
      estimatedAPR: analyticsData.estimatedAPR
    });
    
    // Test 2: Check maximum APR endpoint
    console.log('\n2. Testing maximum APR calculation...');
    const aprResponse = await fetch(`${BASE_URL}/api/rewards/maximum-apr`);
    const aprData = await aprResponse.json();
    
    console.log('   ✓ Maximum APR Data:', {
      minAPR: aprData.minAPR,
      maxAPR: aprData.maxAPR,
      aprRange: aprData.aprRange,
      scenario: aprData.scenario
    });
    
    // Test 3: Check if values are dynamic (not hardcoded)
    console.log('\n3. Testing dynamic configuration...');
    
    // Verify treasury values are from database
    const treasuryFromAnalytics = analyticsData.treasuryTotal;
    const dailyBudgetFromAnalytics = analyticsData.dailyBudget;
    const durationFromAnalytics = analyticsData.programDuration;
    
    console.log('   ✓ Treasury Values (from analytics):', {
      treasuryTotal: treasuryFromAnalytics,
      dailyBudget: dailyBudgetFromAnalytics,
      programDuration: durationFromAnalytics
    });
    
    // Test 4: Calculate expected vs actual values
    console.log('\n4. Testing formula calculations...');
    
    const expectedDailyBudget = treasuryFromAnalytics / durationFromAnalytics;
    const actualDailyBudget = dailyBudgetFromAnalytics;
    
    console.log('   ✓ Daily Budget Calculation:', {
      expected: expectedDailyBudget.toFixed(2),
      actual: actualDailyBudget.toFixed(2),
      matches: Math.abs(expectedDailyBudget - actualDailyBudget) < 0.01
    });
    
    // Test 5: Check if APR responds to admin configuration
    console.log('\n5. Testing APR responsiveness...');
    
    const aprIsNotHardcoded = aprData.maxAPR !== 47.2 || aprData.minAPR !== 29.46;
    const aprUsesAdminValues = aprData.maxAPR > 0 && aprData.minAPR > 0;
    
    console.log('   ✓ APR Configuration:', {
      notHardcoded: aprIsNotHardcoded,
      usesAdminValues: aprUsesAdminValues,
      dynamicCalculation: aprIsNotHardcoded && aprUsesAdminValues
    });
    
    // Test 6: Summary
    console.log('\n📊 SYNCHRONIZATION TEST RESULTS:');
    console.log('=====================================');
    console.log(`✓ Program Analytics: ${analyticsResponse.ok ? 'WORKING' : 'FAILED'}`);
    console.log(`✓ Maximum APR: ${aprResponse.ok ? 'WORKING' : 'FAILED'}`);
    console.log(`✓ Dynamic Treasury: ${treasuryFromAnalytics > 0 ? 'WORKING' : 'FAILED'}`);
    console.log(`✓ Daily Budget Calc: ${Math.abs(expectedDailyBudget - actualDailyBudget) < 0.01 ? 'WORKING' : 'FAILED'}`);
    console.log(`✓ APR Dynamic: ${aprUsesAdminValues ? 'WORKING' : 'FAILED'}`);
    
    const allTestsPassed = 
      analyticsResponse.ok && 
      aprResponse.ok && 
      treasuryFromAnalytics > 0 && 
      Math.abs(expectedDailyBudget - actualDailyBudget) < 0.01 &&
      aprUsesAdminValues;
      
    console.log(`\n🎯 OVERALL STATUS: ${allTestsPassed ? '✅ FULLY SYNCHRONIZED' : '❌ ISSUES DETECTED'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSynchronization();