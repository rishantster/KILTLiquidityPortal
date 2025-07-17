import fetch from 'node-fetch';

// Base network Uniswap V3 subgraph endpoint
const UNISWAP_V3_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-base';

interface UniswapPosition {
  id: string;
  owner: string;
  pool: {
    id: string;
    token0: {
      id: string;
      symbol: string;
      name: string;
      decimals: string;
    };
    token1: {
      id: string;
      symbol: string;
      name: string;
      decimals: string;
    };
    feeTier: string;
    tick: string;
    sqrtPrice: string;
  };
  tickLower: {
    tickIdx: string;
  };
  tickUpper: {
    tickIdx: string;
  };
  liquidity: string;
  depositedToken0: string;
  depositedToken1: string;
  withdrawnToken0: string;
  withdrawnToken1: string;
  collectedFeesToken0: string;
  collectedFeesToken1: string;
  transaction: {
    timestamp: string;
  };
}

interface UniswapSubgraphResponse {
  data: {
    positions: UniswapPosition[];
  };
}

class UniswapSubgraphService {
  private readonly subgraphUrl: string;

  constructor() {
    this.subgraphUrl = UNISWAP_V3_SUBGRAPH_URL;
  }

  async getPositionsByOwner(ownerAddress: string): Promise<UniswapPosition[]> {
    const query = `
      query GetPositions($owner: String!) {
        positions(
          where: { owner: $owner }
          orderBy: transaction__timestamp
          orderDirection: desc
        ) {
          id
          owner
          pool {
            id
            token0 {
              id
              symbol
              name
              decimals
            }
            token1 {
              id
              symbol
              name
              decimals
            }
            feeTier
            tick
            sqrtPrice
          }
          tickLower {
            tickIdx
          }
          tickUpper {
            tickIdx
          }
          liquidity
          depositedToken0
          depositedToken1
          withdrawnToken0
          withdrawnToken1
          collectedFeesToken0
          collectedFeesToken1
          transaction {
            timestamp
          }
        }
      }
    `;

    try {
      const response = await fetch(this.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { owner: ownerAddress.toLowerCase() },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as UniswapSubgraphResponse;
      return data.data.positions || [];
    } catch (error) {
      console.error('Error fetching positions from Uniswap subgraph:', error);
      return [];
    }
  }

  async getKiltPositionsByOwner(ownerAddress: string, kiltTokenAddress: string): Promise<UniswapPosition[]> {
    const query = `
      query GetKiltPositions($owner: String!, $kiltToken: String!) {
        positions(
          where: { 
            owner: $owner
            or: [
              { pool_: { token0: $kiltToken } }
              { pool_: { token1: $kiltToken } }
            ]
          }
          orderBy: transaction__timestamp
          orderDirection: desc
        ) {
          id
          owner
          pool {
            id
            token0 {
              id
              symbol
              name
              decimals
            }
            token1 {
              id
              symbol
              name
              decimals
            }
            feeTier
            tick
            sqrtPrice
          }
          tickLower {
            tickIdx
          }
          tickUpper {
            tickIdx
          }
          liquidity
          depositedToken0
          depositedToken1
          withdrawnToken0
          withdrawnToken1
          collectedFeesToken0
          collectedFeesToken1
          transaction {
            timestamp
          }
        }
      }
    `;

    try {
      const response = await fetch(this.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { 
            owner: ownerAddress.toLowerCase(),
            kiltToken: kiltTokenAddress.toLowerCase()
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as UniswapSubgraphResponse;
      return data.data.positions || [];
    } catch (error) {
      console.error('Error fetching KILT positions from Uniswap subgraph:', error);
      return [];
    }
  }

  async getPositionById(positionId: string): Promise<UniswapPosition | null> {
    const query = `
      query GetPosition($id: String!) {
        position(id: $id) {
          id
          owner
          pool {
            id
            token0 {
              id
              symbol
              name
              decimals
            }
            token1 {
              id
              symbol
              name
              decimals
            }
            feeTier
            tick
            sqrtPrice
          }
          tickLower {
            tickIdx
          }
          tickUpper {
            tickIdx
          }
          liquidity
          depositedToken0
          depositedToken1
          withdrawnToken0
          withdrawnToken1
          collectedFeesToken0
          collectedFeesToken1
          transaction {
            timestamp
          }
        }
      }
    `;

    try {
      const response = await fetch(this.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { id: positionId },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as { data: { position: UniswapPosition } };
      return data.data.position || null;
    } catch (error) {
      console.error('Error fetching position from Uniswap subgraph:', error);
      return null;
    }
  }

  // Helper method to convert position data to our app format
  transformPositionData(position: UniswapPosition, currentPrice: number = 0.0176) {
    const isKiltToken0 = position.pool.token0.symbol === 'KILT';
    const feeTier = parseInt(position.pool.feeTier) / 10000; // Convert to percentage
    
    // Calculate token amounts (deposited - withdrawn)
    const token0Amount = parseFloat(position.depositedToken0) - parseFloat(position.withdrawnToken0);
    const token1Amount = parseFloat(position.depositedToken1) - parseFloat(position.withdrawnToken1);
    
    // Calculate USD value (simplified - in production you'd use price feeds)
    const ethAmount = isKiltToken0 ? token1Amount : token0Amount;
    const kiltAmount = isKiltToken0 ? token0Amount : token1Amount;
    const estimatedUsdValue = ethAmount * 3500 + kiltAmount * currentPrice; // ETH ~$3500, KILT from API
    
    // Calculate price range from ticks
    const tickLower = parseInt(position.tickLower.tickIdx);
    const tickUpper = parseInt(position.tickUpper.tickIdx);
    const currentTick = parseInt(position.pool.tick);
    
    // Check if position is in range
    const inRange = currentTick >= tickLower && currentTick <= tickUpper;
    
    // Convert ticks to prices (simplified calculation)
    const priceLower = Math.pow(1.0001, tickLower);
    const priceUpper = Math.pow(1.0001, tickUpper);
    
    return {
      id: position.id,
      nftTokenId: position.id.split('#')[1] || position.id,
      tokenAmountKilt: kiltAmount.toFixed(4),
      tokenAmountEth: ethAmount.toFixed(6),
      currentValueUsd: estimatedUsdValue,
      isActive: parseFloat(position.liquidity) > 0,
      priceRangeLower: priceLower,
      priceRangeUpper: priceUpper,
      feeTier: feeTier,
      liquidity: position.liquidity,
      inRange: inRange,
      poolId: position.pool.id,
      token0Symbol: position.pool.token0.symbol,
      token1Symbol: position.pool.token1.symbol,
      createdAt: new Date(parseInt(position.transaction.timestamp) * 1000).toISOString()
    };
  }
}

export const uniswapSubgraphService = new UniswapSubgraphService();