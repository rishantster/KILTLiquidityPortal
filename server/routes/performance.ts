/**
 * Performance optimization endpoints
 */

import type { Express } from "express";
import { performanceMonitor } from '../blazing-fast-optimizer';

export function registerPerformanceRoutes(app: Express) {
  // Get current performance metrics
  app.get("/api/performance/metrics", (req, res) => {
    try {
      const report = performanceMonitor.getOptimizationReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to get performance metrics" });
    }
  });

  // Get slow request analysis
  app.get("/api/performance/slow-requests", (req, res) => {
    try {
      const slowRequests = performanceMonitor.getSlowRequests();
      res.json({
        count: slowRequests.length,
        requests: slowRequests,
        analysis: {
          criticalEndpoints: slowRequests.filter(r => r.duration > 5000),
          moderateEndpoints: slowRequests.filter(r => r.duration > 1000 && r.duration <= 5000),
          recommendations: [
            "Apply aggressive caching to endpoints over 1000ms",
            "Implement parallel processing for data-heavy operations",
            "Consider database query optimization for frequent calls"
          ]
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze slow requests" });
    }
  });

  // Get blazing fast optimization summary
  app.get("/api/performance/summary", async (req, res) => {
    try {
      const { performanceSummary } = await import('../performance-summary');
      const summary = performanceSummary.getOptimizationReport();
      const recommendations = performanceSummary.getRecommendations();
      
      res.json({
        ...summary,
        recommendations,
        timestamp: new Date().toISOString(),
        status: 'blazing-fast'
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get performance summary" });
    }
  });
}