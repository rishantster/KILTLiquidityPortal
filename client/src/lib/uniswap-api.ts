// Direct Uniswap API integration for blazing fast position loading
import { Address } from 'viem';

// Use the correct Base network subgraph endpoint
const BASE_SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest';

export interface UniswapPosition {
  id: string;
  tokenId: string;
  owner: string;
  pool: {
    id: string;
    token0: {
      id: string;
      symbol: string;
      decimals: string;
    };
    token1: {
      id: string;
      symbol: string;
      decimals: string;
    };
    feeTier: string;
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

export class UniswapAPIService {
  private readonly KILT_TOKEN = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
  private readonly WETH_TOKEN = '0x4200000000000000000000000000000000000006';

  async getUserPositions(walletAddress: Address): Promise<UniswapPosition[]> {
    const query = `
      query GetUserPositions($owner: String!) {
        positions(
          where: {
            owner: $owner
            liquidity_gt: "0"
          }
          first: 100
          orderBy: tokenId
          orderDirection: desc
        ) {
          id
          tokenId
          owner
          liquidity
          depositedToken0
          depositedToken1
          withdrawnToken0
          withdrawnToken1
          collectedFeesToken0
          collectedFeesToken1
          pool {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
            feeTier
          }
          tickLower {
            tickIdx
          }
          tickUpper {
            tickIdx
          }
          transaction {
            timestamp
          }
        }
      }
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(BASE_SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            owner: walletAddress.toLowerCase(),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return data.data.positions || [];
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching positions from Uniswap API:', error);
      return [];
    }
  }

  async getKiltPositions(walletAddress: Address): Promise<UniswapPosition[]> {
    // Optimized query to get KILT positions directly
    const query = `
      query GetKiltPositions($owner: String!) {
        positions(
          where: {
            owner: $owner
            liquidity_gt: "0"
          }
          first: 100
          orderBy: tokenId
          orderDirection: desc
        ) {
          id
          tokenId
          owner
          liquidity
          depositedToken0
          depositedToken1
          withdrawnToken0
          withdrawnToken1
          collectedFeesToken0
          collectedFeesToken1
          pool {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
            feeTier
          }
          tickLower {
            tickIdx
          }
          tickUpper {
            tickIdx
          }
          transaction {
            timestamp
          }
        }
      }
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    try {
      const response = await fetch(BASE_SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            owner: walletAddress.toLowerCase(),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      const positions = data.data.positions || [];
      
      // Filter for KILT positions
      return positions.filter((position: any) => {
        const token0 = position.pool.token0.id.toLowerCase();
        const token1 = position.pool.token1.id.toLowerCase();
        const kilt = this.KILT_TOKEN.toLowerCase();
        
        return token0 === kilt || token1 === kilt;
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        console.error('Error fetching KILT positions from Uniswap API:', error.message);
      } else {
        console.error('Error fetching KILT positions from Uniswap API:', error);
      }
      return [];
    }
  }

  async getPoolInfo(poolAddress: Address) {
    const query = `
      query GetPoolInfo($poolId: String!) {
        pool(id: $poolId) {
          id
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
          feeTier
          liquidity
          sqrtPrice
          tick
          volumeUSD
          totalValueLockedUSD
        }
      }
    `;

    try {
      const response = await fetch(BASE_SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            poolId: poolAddress.toLowerCase(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return data.data.pool;
    } catch (error) {
      console.error('Error fetching pool info from Uniswap API:', error);
      return null;
    }
  }

  // Convert position to display format
  convertPositionToDisplay(position: UniswapPosition) {
    return {
      tokenId: position.tokenId,
      nftTokenId: position.tokenId,
      token0Address: position.pool.token0.id,
      token1Address: position.pool.token1.id,
      amount0: position.depositedToken0,
      amount1: position.depositedToken1,
      liquidity: position.liquidity,
      poolAddress: position.pool.id,
      feeTier: parseInt(position.pool.feeTier),
      tickLower: parseInt(position.tickLower.tickIdx),
      tickUpper: parseInt(position.tickUpper.tickIdx),
      isActive: parseInt(position.liquidity) > 0,
      createdAt: new Date(parseInt(position.transaction.timestamp) * 1000).toISOString(),
      token0Symbol: position.pool.token0.symbol,
      token1Symbol: position.pool.token1.symbol,
      collectedFeesToken0: position.collectedFeesToken0,
      collectedFeesToken1: position.collectedFeesToken1,
    };
  }
}

export const uniswapAPI = new UniswapAPIService();