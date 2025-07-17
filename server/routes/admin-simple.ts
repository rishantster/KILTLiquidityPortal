import { Router } from 'express';
import { adminService } from '../admin-service';

const router = Router();

// Get treasury configuration
router.get('/treasury', async (req, res) => {
  try {
    const stats = await adminService.getAdminTreasuryStats();
    res.json(stats.treasury);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch treasury configuration' });
  }
});

// Get program configuration
router.get('/config', async (req, res) => {
  try {
    const settings = await adminService.getCurrentProgramSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch program configuration' });
  }
});

// Update program settings
router.put('/settings', async (req, res) => {
  try {
    const updatedSettings = await adminService.updateProgramSettings(req.body);
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update program settings' });
  }
});

// Update treasury configuration
router.put('/treasury', async (req, res) => {
  try {
    const updatedTreasury = await adminService.updateTreasuryConfig(req.body);
    res.json(updatedTreasury);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update treasury configuration' });
  }
});

export { router as adminSimpleRouter };