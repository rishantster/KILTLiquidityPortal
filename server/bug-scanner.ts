import { promises as fs } from 'fs';
import { join } from 'path';

export interface BugScanResult {
  timestamp: string;
  totalFiles: number;
  scannedFiles: number;
  issues: BugIssue[];
  criticalBugs: CriticalBug[];
  warnings: BugWarning[];
  statistics: BugStatistics;
}

export interface BugIssue {
  file: string;
  line: number;
  column: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  code: string;
  fix: string;
}

export interface CriticalBug {
  file: string;
  type: 'memory_leak' | 'null_pointer' | 'infinite_loop' | 'security_hole' | 'data_corruption';
  description: string;
  impact: string;
  urgency: 'immediate' | 'today' | 'this_week';
}

export interface BugWarning {
  file: string;
  type: 'performance' | 'maintainability' | 'compatibility' | 'style';
  description: string;
  suggestion: string;
}

export interface BugStatistics {
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  fixableCount: number;
  estimatedFixTime: string;
}

export class BugScanner {
  private static instance: BugScanner;

  private constructor() {}

  static getInstance(): BugScanner {
    if (!BugScanner.instance) {
      BugScanner.instance = new BugScanner();
    }
    return BugScanner.instance;
  }

  async scanCodebase(): Promise<BugScanResult> {
    const timestamp = new Date().toISOString();
    const issues: BugIssue[] = [];
    const criticalBugs: CriticalBug[] = [];
    const warnings: BugWarning[] = [];

    try {
      // Scan client-side code
      const clientIssues = await this.scanDirectory('./client/src');
      issues.push(...clientIssues.issues);
      criticalBugs.push(...clientIssues.criticalBugs);
      warnings.push(...clientIssues.warnings);

      // Scan server-side code
      const serverIssues = await this.scanDirectory('./server');
      issues.push(...serverIssues.issues);
      criticalBugs.push(...serverIssues.criticalBugs);
      warnings.push(...serverIssues.warnings);

      // Scan shared code
      const sharedIssues = await this.scanDirectory('./shared');
      issues.push(...sharedIssues.issues);
      criticalBugs.push(...sharedIssues.criticalBugs);
      warnings.push(...sharedIssues.warnings);

      const statistics = this.calculateStatistics(issues, criticalBugs, warnings);

      return {
        timestamp,
        totalFiles: clientIssues.totalFiles + serverIssues.totalFiles + sharedIssues.totalFiles,
        scannedFiles: clientIssues.scannedFiles + serverIssues.scannedFiles + sharedIssues.scannedFiles,
        issues,
        criticalBugs,
        warnings,
        statistics
      };

    } catch (error) {
      return {
        timestamp,
        totalFiles: 0,
        scannedFiles: 0,
        issues: [{
          file: 'scanner',
          line: 0,
          column: 0,
          type: 'scanner_error',
          severity: 'critical',
          message: `Bug scanner failed: ${error.message}`,
          code: '',
          fix: 'Fix scanner configuration and try again'
        }],
        criticalBugs: [],
        warnings: [],
        statistics: {
          totalIssues: 1,
          criticalCount: 1,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          fixableCount: 0,
          estimatedFixTime: 'unknown'
        }
      };
    }
  }

  private async scanDirectory(dirPath: string): Promise<{
    totalFiles: number;
    scannedFiles: number;
    issues: BugIssue[];
    criticalBugs: CriticalBug[];
    warnings: BugWarning[];
  }> {
    const issues: BugIssue[] = [];
    const criticalBugs: CriticalBug[] = [];
    const warnings: BugWarning[] = [];
    let totalFiles = 0;
    let scannedFiles = 0;

    try {
      const files = await this.getFileList(dirPath);
      totalFiles = files.length;

      for (const file of files) {
        if (this.shouldScanFile(file)) {
          scannedFiles++;
          const fileContent = await fs.readFile(file, 'utf8');
          const fileIssues = await this.scanFile(file, fileContent);
          
          issues.push(...fileIssues.issues);
          criticalBugs.push(...fileIssues.criticalBugs);
          warnings.push(...fileIssues.warnings);
        }
      }

    } catch (error) {
      // If directory doesn't exist or can't be read, return empty results
    }

    return { totalFiles, scannedFiles, issues, criticalBugs, warnings };
  }

  private async getFileList(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          const subFiles = await this.getFileList(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
    return skipDirs.includes(dirName);
  }

  private shouldScanFile(filePath: string): boolean {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    return extensions.some(ext => filePath.endsWith(ext));
  }

  private async scanFile(filePath: string, content: string): Promise<{
    issues: BugIssue[];
    criticalBugs: CriticalBug[];
    warnings: BugWarning[];
  }> {
    const issues: BugIssue[] = [];
    const criticalBugs: CriticalBug[] = [];
    const warnings: BugWarning[] = [];

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for critical bugs
      this.checkCriticalBugs(filePath, line, lineNumber, criticalBugs);
      
      // Check for general issues
      this.checkGeneralIssues(filePath, line, lineNumber, issues);
      
      // Check for warnings
      this.checkWarnings(filePath, line, lineNumber, warnings);
    }

    return { issues, criticalBugs, warnings };
  }

  private checkCriticalBugs(filePath: string, line: string, lineNumber: number, criticalBugs: CriticalBug[]): void {
    // Memory leak detection
    if (line.includes('setInterval') && !line.includes('clearInterval')) {
      criticalBugs.push({
        file: filePath,
        type: 'memory_leak',
        description: `Potential memory leak: setInterval without clearInterval at line ${lineNumber}`,
        impact: 'Application performance degradation and memory consumption',
        urgency: 'today'
      });
    }

    // Null pointer issues
    if (line.includes('.') && line.includes('?') === false && !line.includes('?.')) {
      const potentialNullAccess = /\w+\.\w+/.test(line) && !line.includes('typeof') && !line.includes('null') && !line.includes('undefined');
      if (potentialNullAccess && line.includes('await') === false) {
        criticalBugs.push({
          file: filePath,
          type: 'null_pointer',
          description: `Potential null reference access at line ${lineNumber}`,
          impact: 'Runtime errors and application crashes',
          urgency: 'this_week'
        });
      }
    }

    // Infinite loop detection
    if ((line.includes('while(true)') || line.includes('while (true)')) && !line.includes('break')) {
      criticalBugs.push({
        file: filePath,
        type: 'infinite_loop',
        description: `Potential infinite loop detected at line ${lineNumber}`,
        impact: 'Application freeze and high CPU usage',
        urgency: 'immediate'
      });
    }

    // Security holes
    if (line.includes('eval(') || line.includes('innerHTML =') || line.includes('dangerouslySetInnerHTML')) {
      criticalBugs.push({
        file: filePath,
        type: 'security_hole',
        description: `Security vulnerability detected at line ${lineNumber}`,
        impact: 'Potential XSS attacks and code injection',
        urgency: 'immediate'
      });
    }
  }

  private checkGeneralIssues(filePath: string, line: string, lineNumber: number, issues: BugIssue[]): void {
    // Unused variables
    if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
      const variableMatch = line.match(/(const|let|var)\s+(\w+)/);
      if (variableMatch && line.includes('=') && !line.includes('//')) {
        // This is a simplified check - real implementation would track usage
        issues.push({
          file: filePath,
          line: lineNumber,
          column: line.indexOf(variableMatch[2]),
          type: 'unused_variable',
          severity: 'low',
          message: `Potentially unused variable: ${variableMatch[2]}`,
          code: line.trim(),
          fix: 'Remove unused variable or add underscore prefix if intentionally unused'
        });
      }
    }

    // Any type usage
    if (line.includes(': any') || line.includes('<any>')) {
      issues.push({
        file: filePath,
        line: lineNumber,
        column: line.indexOf('any'),
        type: 'type_safety',
        severity: 'medium',
        message: 'Use of "any" type reduces type safety',
        code: line.trim(),
        fix: 'Replace with specific type definition'
      });
    }

    // Large function detection
    if (line.includes('function ') || line.includes('const ') && line.includes('=>')) {
      // This would need more sophisticated analysis in real implementation
    }

    // Missing error handling
    if (line.includes('await ') && !line.includes('try') && !line.includes('catch')) {
      issues.push({
        file: filePath,
        line: lineNumber,
        column: line.indexOf('await'),
        type: 'error_handling',
        severity: 'medium',
        message: 'Async operation without error handling',
        code: line.trim(),
        fix: 'Wrap in try-catch block or add error handling'
      });
    }
  }

  private checkWarnings(filePath: string, line: string, lineNumber: number, warnings: BugWarning[]): void {
    // Performance warnings
    if (line.includes('JSON.parse') && line.includes('JSON.stringify')) {
      warnings.push({
        file: filePath,
        type: 'performance',
        description: `Inefficient JSON serialization/deserialization at line ${lineNumber}`,
        suggestion: 'Consider caching or optimizing data transformation'
      });
    }

    // Maintainability warnings
    if (line.length > 120) {
      warnings.push({
        file: filePath,
        type: 'maintainability',
        description: `Long line at line ${lineNumber} (${line.length} characters)`,
        suggestion: 'Break long lines for better readability'
      });
    }

    // Hardcoded values
    if (/["']\d+["']/.test(line) || line.includes('http://') || line.includes('https://')) {
      warnings.push({
        file: filePath,
        type: 'maintainability',
        description: `Potential hardcoded value at line ${lineNumber}`,
        suggestion: 'Consider moving to configuration file or constants'
      });
    }

    // Style warnings
    if (line.includes('var ')) {
      warnings.push({
        file: filePath,
        type: 'style',
        description: `Use of "var" keyword at line ${lineNumber}`,
        suggestion: 'Use "const" or "let" instead of "var"'
      });
    }
  }

  private calculateStatistics(issues: BugIssue[], criticalBugs: CriticalBug[], warnings: BugWarning[]): BugStatistics {
    const criticalCount = issues.filter(i => i.severity === 'critical').length + criticalBugs.length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;
    
    const totalIssues = criticalCount + highCount + mediumCount + lowCount;
    const fixableCount = issues.filter(i => i.fix && i.fix !== '').length;
    
    // Estimate fix time based on severity
    const estimatedHours = 
      (criticalCount * 4) + // 4 hours per critical
      (highCount * 2) +     // 2 hours per high
      (mediumCount * 1) +   // 1 hour per medium
      (lowCount * 0.5);     // 0.5 hours per low

    let estimatedFixTime: string;
    if (estimatedHours < 1) {
      estimatedFixTime = '< 1 hour';
    } else if (estimatedHours < 8) {
      estimatedFixTime = `${Math.ceil(estimatedHours)} hours`;
    } else {
      estimatedFixTime = `${Math.ceil(estimatedHours / 8)} days`;
    }

    return {
      totalIssues,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      fixableCount,
      estimatedFixTime
    };
  }
}

export const bugScanner = BugScanner.getInstance();