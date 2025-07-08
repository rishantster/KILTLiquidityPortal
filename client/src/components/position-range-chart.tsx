import React from 'react';

interface PositionRangeChartProps {
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  isActive: boolean;
  height?: number;
  showLabels?: boolean;
  className?: string;
}

export const PositionRangeChart: React.FC<PositionRangeChartProps> = ({
  currentPrice,
  minPrice,
  maxPrice,
  isActive,
  height = 64,
  showLabels = true,
  className = ''
}) => {
  // Calculate percentages for positioning
  const priceRange = maxPrice - minPrice;
  const currentPricePercent = Math.min(Math.max(((currentPrice - minPrice) / priceRange) * 100, 0), 100);
  
  // Calculate SVG positions (assuming 20px padding on each side)
  const svgWidth = 200;
  const padding = 20;
  const activeWidth = svgWidth - (padding * 2);
  const minX = padding;
  const maxX = svgWidth - padding;
  const currentX = minX + (activeWidth * currentPricePercent / 100);
  
  // Curve control points
  const midX = (minX + maxX) / 2;
  const curveHeight = height * 0.25; // 25% of height for curve peak
  const baseY = height * 0.7; // 70% down for curve base
  
  return (
    <div className={`relative bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 rounded-lg overflow-hidden border border-white/5 ${className}`} style={{ height }}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-emerald-900/20"></div>
      
      {/* SVG visualization */}
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${svgWidth} ${height}`}>
        {/* Background reference curve */}
        <path
          d={`M ${padding} ${baseY} Q ${midX} ${curveHeight} ${svgWidth - padding} ${baseY}`}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="2,2"
        />
        
        {/* Active position curve */}
        <path
          d={`M ${minX} ${baseY} Q ${midX} ${curveHeight} ${maxX} ${baseY}`}
          stroke={isActive ? '#10b981' : '#ef4444'}
          strokeWidth="3"
          fill="none"
          className="drop-shadow-sm"
        />
        
        {/* Min price marker */}
        <circle
          cx={minX}
          cy={baseY}
          r="4"
          fill={isActive ? '#10b981' : '#ef4444'}
          className="drop-shadow-sm"
        />
        
        {/* Max price marker */}
        <circle
          cx={maxX}
          cy={baseY}
          r="4"
          fill={isActive ? '#10b981' : '#ef4444'}
          className="drop-shadow-sm"
        />
        
        {/* Current price indicator */}
        <line
          x1={currentX}
          y1={curveHeight * 0.5}
          x2={currentX}
          y2={height * 0.9}
          stroke="white"
          strokeWidth="2"
          className="drop-shadow-sm"
        />
        <circle
          cx={currentX}
          cy={curveHeight * 0.8}
          r="3"
          fill="white"
          className="drop-shadow-sm"
        />
        
        {/* Position status indicator */}
        <text
          x={midX}
          y={curveHeight * 0.6}
          textAnchor="middle"
          fill="white"
          fontSize="10"
          fontWeight="bold"
          className="drop-shadow-sm"
        >
          {currentPrice >= minPrice && currentPrice <= maxPrice ? 'In Range' : 'Out of Range'}
        </text>
      </svg>
      
      {/* Price labels */}
      {showLabels && (
        <>
          <div className="absolute bottom-1 left-2 text-xs text-white/60">
            Min: {minPrice.toFixed(4)}
          </div>
          <div className="absolute bottom-1 right-2 text-xs text-white/60">
            Max: {maxPrice.toFixed(4)}
          </div>
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-white/60">
            Current: {currentPrice.toFixed(4)}
          </div>
        </>
      )}
    </div>
  );
};

export default PositionRangeChart;