import express from 'express';
import { uniswapSubgraphService } from '../services/uniswap-subgraph-service.js';
// Using hardcoded KILT token address for speed
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';

const router = express.Router();

// Get positions from Uniswap subgraph (real-time)
router.get('/uniswap/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const positions = await uniswapSubgraphService.getPositionsByOwner(address);
    
    // Transform positions to our app format
    const transformedPositions = positions.map(position => 
      uniswapSubgraphService.transformPositionData(position)
    );

    res.json(transformedPositions);
  } catch (error) {
    console.error('Error fetching Uniswap positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Get KILT positions from Uniswap subgraph (real-time)
router.get('/uniswap-kilt/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const kiltTokenAddress = KILT_TOKEN_ADDRESS;
    
    const positions = await uniswapSubgraphService.getKiltPositionsByOwner(address, kiltTokenAddress);
    
    // Transform positions to our app format
    const transformedPositions = positions.map(position => 
      uniswapSubgraphService.transformPositionData(position)
    );

    res.json(transformedPositions);
  } catch (error) {
    console.error('Error fetching KILT positions:', error);
    res.status(500).json({ error: 'Failed to fetch KILT positions' });
  }
});

// Get single position by ID
router.get('/uniswap-position/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Position ID is required' });
    }

    const position = await uniswapSubgraphService.getPositionById(id);
    
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    const transformedPosition = uniswapSubgraphService.transformPositionData(position);
    res.json(transformedPosition);
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: 'Failed to fetch position' });
  }
});

export default router;