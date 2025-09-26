/**
 * Test coordination system between ZANTARA PHI and ZANTARA Bridge
 */

import { bridgeReader } from './src/coordination/bridge-reader.js';
import { phiCoordinator } from './src/coordination/phi-coordinator.js';

async function testCoordination() {
  console.log('🏛️ ZANTARA PHI - Bridge Coordination Test');
  console.log('==========================================\n');

  // Test Bridge connectivity
  console.log('🌉 Testing Bridge Connection...');
  const bridgeStatus = await bridgeReader.getHealthStatus();
  console.log(`   Status: ${bridgeStatus.status}`);
  console.log(`   Available: ${bridgeStatus.available ? '✅' : '❌'}`);
  if (bridgeStatus.version) {
    console.log(`   Version: ${bridgeStatus.version}`);
  }

  // Test coordination state
  console.log('\n🎯 Testing Coordination State...');
  const coordination = await phiCoordinator.getCoordinationState();
  console.log(`   Mode: ${coordination.mode.toUpperCase()}`);
  console.log(`   Bridge Available: ${coordination.bridgeStatus.available ? '✅' : '❌'}`);
  console.log(`   PHI Services: ${Object.keys(coordination.phiServices.services).length}`);

  // Test PHI services
  console.log('\n🔮 Testing PHI Services...');
  try {
    const testResult = await phiCoordinator.executeGoldenSplit("Test coordination between ZANTARA PHI and Bridge systems.");
    console.log(`   Golden Split: ✅ (${testResult.data.sections.length} sections)`);
  } catch (error) {
    console.log(`   Golden Split: ❌ (${error.message})`);
  }

  // Show service manifest
  console.log('\n📋 PHI Service Manifest:');
  const manifest = phiCoordinator.getServiceManifest();
  Object.entries(manifest.services).forEach(([key, service]) => {
    console.log(`   ${key}: ${service.description}`);
  });

  console.log('\n✨ Coordination Summary:');
  console.log(`   Bridge+PHI Mode: ${coordination.mode === 'hybrid' ? '✅ Active' : '❌ Standalone'}`);
  console.log(`   Cost Comparison: Bridge €2,265/year vs PHI €240/year`);
  console.log(`   Philosophy: φ = 1.618033988749895`);
}

testCoordination().catch(console.error);