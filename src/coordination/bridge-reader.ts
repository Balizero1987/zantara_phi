/**
 * ZANTARA Bridge Coordination Layer
 * READ-ONLY connection to ZANTARA-Bridge without touching its codebase
 *
 * Philosophy: Respectful coexistence through API calls
 */

const PHI = 1.618033988749895;

export interface BridgeStatus {
  status: string;
  version?: string;
  uptime?: number;
  metrics?: {
    requests?: number;
    errors?: number;
    errorRate?: number;
    responseTimeMs?: number;
  };
  available: boolean;
}

export interface BridgeHandlerInfo {
  totalHandlers?: number;
  workingHandlers?: number;
  categories?: string[];
  lastCheck?: string;
}

export class ZantaraBridgeReader {
  private baseUrl: string;
  private timeout: number = 5000; // 5s timeout

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if ZANTARA-Bridge is available and healthy
   */
  async getHealthStatus(): Promise<BridgeStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        return {
          status: 'error',
          available: false
        };
      }

      const data = await response.json() as any;
      return {
        status: data.status || 'healthy',
        version: data.version,
        uptime: data.uptime,
        metrics: data.metrics,
        available: true
      };
    } catch (error) {
      return {
        status: 'offline',
        available: false
      };
    }
  }

  /**
   * Get Bridge metrics (if available)
   */
  async getMetrics(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.log('📊 Bridge metrics not available:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Test a simple Bridge handler (read-only)
   */
  async testBridgeHandler(handlerKey: string = 'contact.info'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'zantara-internal-dev-key-2025' // Known dev key
        },
        body: JSON.stringify({
          key: handlerKey,
          params: { test: true }
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get comprehensive Bridge status for coordination
   */
  async getCoordinationInfo(): Promise<{
    bridge: BridgeStatus;
    handlers: BridgeHandlerInfo;
    recommendation: string;
  }> {
    const bridgeStatus = await this.getHealthStatus();
    const metrics = await this.getMetrics();
    const handlerTest = await this.testBridgeHandler();

    const handlerInfo: BridgeHandlerInfo = {
      totalHandlers: metrics?.popular?.paths?.length || 0,
      workingHandlers: handlerTest ? 1 : 0,
      lastCheck: new Date().toISOString()
    };

    // Golden ratio-based recommendation
    const availability = bridgeStatus.available ? PHI : 1/PHI;
    const recommendation = availability > 1
      ? "🟢 Bridge available - Coordinate services"
      : "🟡 Bridge offline - PHI standalone mode";

    return {
      bridge: bridgeStatus,
      handlers: handlerInfo,
      recommendation
    };
  }

  /**
   * Monitor Bridge status continuously
   */
  async startMonitoring(intervalMs: number = 30000): Promise<() => void> {
    const monitor = async () => {
      const status = await this.getHealthStatus();
      console.log(`🌉 Bridge Status: ${status.status} (${status.available ? 'Available' : 'Offline'})`);
    };

    // Initial check
    await monitor();

    // Periodic monitoring
    const interval = setInterval(monitor, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  }
}

/**
 * Singleton instance for easy access
 */
export const bridgeReader = new ZantaraBridgeReader();

/**
 * Quick status check function
 */
export async function checkBridgeAvailability(): Promise<boolean> {
  const status = await bridgeReader.getHealthStatus();
  return status.available;
}

/**
 * CLI usage
 */
if (process.env.RUN_AS_CLI) {
  (async () => {
    console.log('🌉 ZANTARA Bridge Reader (φ = 1.618033988749895)');
    console.log('==========================================');

    const coordination = await bridgeReader.getCoordinationInfo();

    console.log('\n📊 BRIDGE STATUS:');
    console.log(`   Status: ${coordination.bridge.status}`);
    console.log(`   Available: ${coordination.bridge.available ? '✅' : '❌'}`);
    console.log(`   Version: ${coordination.bridge.version || 'Unknown'}`);

    if (coordination.bridge.metrics) {
      console.log('\n📈 BRIDGE METRICS:');
      console.log(`   Requests: ${coordination.bridge.metrics.requests || 0}`);
      console.log(`   Error Rate: ${coordination.bridge.metrics.errorRate || 0}%`);
      console.log(`   Response Time: ${coordination.bridge.metrics.responseTimeMs || 0}ms`);
    }

    console.log('\n🎯 COORDINATION:');
    console.log(`   ${coordination.recommendation}`);
    console.log(`   Strategy: ${coordination.bridge.available ? 'Hybrid Mode' : 'PHI Standalone'}`);

    console.log('\n✨ Golden Ratio Insight:');
    const phi_ratio = coordination.bridge.available ? PHI : 1/PHI;
    console.log(`   φ Factor: ${phi_ratio.toFixed(6)}`);
    console.log(`   Harmony: ${phi_ratio > 1 ? 'Bridge+PHI synergy' : 'PHI independence'}`);
  })();
}