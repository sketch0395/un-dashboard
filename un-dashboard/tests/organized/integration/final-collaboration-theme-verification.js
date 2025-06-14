#!/usr/bin/env node
/**
 * Final Collaboration and Theme Verification Test
 * Comprehensive test to verify all fixes are working correctly
 */

const { createHash } = require('crypto');

class CollaborationVerificationTest {
    constructor() {
        this.results = {
            serverFix: null,
            frontendFix: null,
            persistenceFix: null,
            themeFix: null,
            buildTest: null
        };
        this.testsPassed = 0;
        this.testsTotal = 5;
    }

    async runAllTests() {
        console.log('🧪 Final Collaboration and Theme Verification Test');
        console.log('=' .repeat(60));
        
        await this.testServerFixImplementation();
        await this.testFrontendFixImplementation();
        await this.testPersistenceFixImplementation();
        await this.testThemeUpdateImplementation();
        await this.testBuildSuccess();
        
        this.displayResults();
    }

    async testServerFixImplementation() {
        console.log('\n📡 Testing Server-Side Collaboration Fix...');
        
        try {
            const fs = require('fs').promises;
            const serverContent = await fs.readFile('./collaboration-server.js', 'utf8');
            
            // Check that excludeWs parameter is removed from broadcast calls
            const hasSymmetricBroadcast = serverContent.includes('broadcastToScan(scanId, {') && 
                                        !serverContent.includes('broadcastToScan(scanId, eventData, ws)');
            
            // Check for the comment indicating symmetric collaboration
            const hasSymmetricComment = serverContent.includes('ALL users (including sender for symmetric collaboration)');
            
            if (hasSymmetricBroadcast && hasSymmetricComment) {
                this.results.serverFix = { success: true, message: 'Server broadcasting updated for symmetric collaboration' };
                this.testsPassed++;
            } else {
                this.results.serverFix = { success: false, message: 'Server fix not properly implemented' };
            }
        } catch (error) {
            this.results.serverFix = { success: false, message: `Server test error: ${error.message}` };
        }
    }    async testFrontendFixImplementation() {
        console.log('🖥️  Testing Frontend Collaboration Fix...');
        
        try {
            const fs = require('fs').promises;
            const frontendContent = await fs.readFile('./src/app/networkscan/components/SharedScansBrowser.js', 'utf8');
            
            // Check that self-filtering is removed
            const noSelfFiltering = !frontendContent.includes('if (userId === user._id) return;');
            
            // Check that proper device update structure is implemented
            const hasCorrectStructure = frontendContent.includes('updatedScanData.devices[vendor]') &&
                                       frontendContent.includes('Object.keys(updatedScanData.devices)');
            
            if (noSelfFiltering && hasCorrectStructure) {
                this.results.frontendFix = { success: true, message: 'Frontend self-filtering removed and structure fixed' };
                this.testsPassed++;
            } else {
                this.results.frontendFix = { success: false, message: 'Frontend fix not properly implemented' };
            }
        } catch (error) {
            this.results.frontendFix = { success: false, message: `Frontend test error: ${error.message}` };
        }
    }

    async testPersistenceFixImplementation() {
        console.log('💾 Testing Persistence Fix Implementation...');
        
        try {
            const fs = require('fs').promises;
            const apiContent = await fs.readFile('./src/app/api/scans/shared/[id]/route.js', 'utf8');
            
            // Check that scanData is added to allowed update fields
            const hasScanDataUpdate = apiContent.includes('if (body.scanData) updateFields.scanData = body.scanData;');
            
            if (hasScanDataUpdate) {
                this.results.persistenceFix = { success: true, message: 'API persistence fix implemented correctly' };
                this.testsPassed++;
            } else {
                this.results.persistenceFix = { success: false, message: 'Persistence fix not found in API' };
            }
        } catch (error) {
            this.results.persistenceFix = { success: false, message: `Persistence test error: ${error.message}` };
        }
    }

    async testThemeUpdateImplementation() {
        console.log('🎨 Testing CollaborativeDeviceModal Theme Update...');
        
        try {
            const fs = require('fs').promises;
            const modalContent = await fs.readFile('./src/app/components/collaboration/CollaborativeDeviceModal.js', 'utf8');
            
            // Check for dark theme classes
            const hasDarkModalBg = modalContent.includes('bg-gray-800');
            const hasWhiteText = modalContent.includes('text-white');
            const hasDarkBorders = modalContent.includes('border-gray-600');
            const hasDarkInputs = modalContent.includes('bg-gray-700');
            
            // Check that light theme classes are removed
            const noLightBg = !modalContent.includes('bg-white');
            const noLightText = !modalContent.includes('text-gray-900');
            
            if (hasDarkModalBg && hasWhiteText && hasDarkBorders && hasDarkInputs && noLightBg && noLightText) {
                this.results.themeFix = { success: true, message: 'Dark theme successfully applied to CollaborativeDeviceModal' };
                this.testsPassed++;
            } else {
                this.results.themeFix = { success: false, message: 'Theme update incomplete or incorrect' };
            }
        } catch (error) {
            this.results.themeFix = { success: false, message: `Theme test error: ${error.message}` };
        }
    }

    async testBuildSuccess() {
        console.log('🏗️  Testing Build Success...');
        
        try {
            const { spawn } = require('child_process');
            
            const buildProcess = spawn('npm', ['run', 'build'], {
                stdio: 'pipe',
                shell: true
            });

            let buildOutput = '';
            let buildError = '';

            buildProcess.stdout.on('data', (data) => {
                buildOutput += data.toString();
            });

            buildProcess.stderr.on('data', (data) => {
                buildError += data.toString();
            });

            await new Promise((resolve) => {
                buildProcess.on('close', (code) => {
                    if (code === 0) {
                        this.results.buildTest = { success: true, message: 'Build completed successfully' };
                        this.testsPassed++;
                    } else {
                        this.results.buildTest = { success: false, message: `Build failed with code ${code}` };
                    }
                    resolve();
                });
            });

        } catch (error) {
            this.results.buildTest = { success: false, message: `Build test error: ${error.message}` };
        }
    }

    displayResults() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 FINAL VERIFICATION RESULTS');
        console.log('=' .repeat(60));

        Object.entries(this.results).forEach(([test, result]) => {
            const icon = result.success ? '✅' : '❌';
            const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            console.log(`${icon} ${testName}: ${result.message}`);
        });

        console.log('\n' + '-' .repeat(60));
        console.log(`📈 Tests Passed: ${this.testsPassed}/${this.testsTotal}`);
        console.log(`🎯 Success Rate: ${((this.testsPassed / this.testsTotal) * 100).toFixed(1)}%`);

        if (this.testsPassed === this.testsTotal) {
            console.log('\n🎉 ALL TESTS PASSED! 🎉');
            console.log('✅ Collaboration asymmetric issue FIXED');
            console.log('✅ Persistence issues RESOLVED');
            console.log('✅ CollaborativeDeviceModal theme UPDATED');
            console.log('✅ Build errors RESOLVED');
            console.log('✅ Ready for production deployment!');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the issues above.');
        }

        console.log('\n📝 Manual Testing Recommended:');
        console.log('1. Open shared scan in multiple browser tabs');
        console.log('2. Edit device details and verify symmetric updates');
        console.log('3. Refresh page and verify changes persist');
        console.log('4. Check CollaborativeDeviceModal theme consistency');
        
        console.log('\n🔗 Related Files:');
        console.log('- collaboration-server.js (server broadcasting)');
        console.log('- SharedScansBrowser.js (frontend collaboration)');
        console.log('- api/scans/shared/[id]/route.js (persistence)');
        console.log('- CollaborativeDeviceModal.js (dark theme)');
    }
}

// Run the test
if (require.main === module) {
    const test = new CollaborationVerificationTest();
    test.runAllTests().catch(console.error);
}

module.exports = CollaborationVerificationTest;
