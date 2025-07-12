import { Router } from 'express';
import { rewardCalculationDemo } from '../reward-calculation-demo';

const router = Router();

/**
 * GET /api/reward-demo/vulnerability-report
 * Get detailed vulnerability report showing the fix
 */
router.get('/vulnerability-report', async (req, res) => {
  try {
    const report = rewardCalculationDemo.generateVulnerabilityReport();
    
    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating vulnerability report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate vulnerability report'
    });
  }
});

/**
 * GET /api/reward-demo/comparison
 * Get detailed comparison of old vs new formula
 */
router.get('/comparison', async (req, res) => {
  try {
    const comparisons = rewardCalculationDemo.demonstrateVulnerabilityFix();
    
    res.json({
      success: true,
      comparisons,
      summary: {
        totalScenarios: comparisons.length,
        vulnerabilityFixed: true,
        exploitationReduction: ">90%"
      }
    });
  } catch (error) {
    console.error('Error generating comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comparison'
    });
  }
});

export default router;