import jwt from 'jsonwebtoken';

const SEB_SECRET = process.env.SEB_SECRET || 'recruitai_seb_secure_2026';

/**
 * Generates a secure token for an exam assignment
 * @param assignmentId UUID of the exam assignment
 * @param candidateId UUID of the candidate
 * @param expiresIn Expiry in seconds (default 24h)
 */
export function generateExamToken(assignmentId: string, candidateId: string, expiresIn: number = 86400) {
    return jwt.sign(
        { assignmentId, candidateId },
        SEB_SECRET,
        { expiresIn }
    );
}

/**
 * Verifies an exam token
 */
export function verifyExamToken(token: string) {
    try {
        return jwt.verify(token, SEB_SECRET) as { assignmentId: string, candidateId: string };
    } catch (e) {
        return null;
    }
}

/**
 * Checks if the request is coming from Safe Exam Browser
 */
export function isSebBrowser(userAgent: string) {
    // Safe Exam Browser adds 'SEB' to the user agent
    return userAgent.includes('SEB/') || userAgent.includes('SafeExamBrowser');
}

/**
 * Generates the XML content for a .seb configuration file
 */
export function generateSebConfig(startUrl: string) {
    // A production-grade SEB config (PList XML format)
    // We enable camera/mic used for proctoring
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>URLFilterEnable</key>
	<false/>
	<key>URLFilterEnableRules</key>
	<false/>
	<key>URLFilterRules</key>
	<array/>
	<key>additionalResources</key>
	<array/>
	<key>allowAudioCapture</key>
	<true/>
	<key>allowCameraCapture</key>
	<true/>
	<key>allowDictation</key>
	<false/>
	<key>allowDisplayMirroring</key>
	<false/>
	<key>allowFlashFullscreen</key>
	<false/>
	<key>allowPreferencesWindow</key>
	<false/>
	<key>allowQuit</key>
	<true/>
	<key>allowScreenSharing</key>
	<false/>
	<key>allowSiri</key>
	<false/>
	<key>allowSpellCheck</key>
	<false/>
	<key>allowUserSwitching</key>
	<false/>
	<key>allowVideoCapture</key>
	<true/>
	<key>allowVirtualMachine</key>
	<false/>
	<key>allowWlan</key>
	<true/>
	<key>browserViewMode</key>
	<integer>0</integer>
	<key>browserWindowAllowReload</key>
	<true/>
	<key>browserWindowShowURL</key>
	<false/>
	<key>chooseFileToUploadPolicy</key>
	<integer>0</integer>
	<key>confirmQuit</key>
	<true/>
	<key>enableAltF4Quit</key>
	<true/>
	<key>enableAltTab</key>
	<false/>
	<key>enableAppSwitcher</key>
	<false/>
	<key>enableAppSwitcherWin</key>
	<false/>
	<key>enableCtrlAltDel</key>
	<false/>
	<key>enableEscQuit</key>
	<true/>
	<key>enableF12Reload</key>
	<false/>
	<key>enablePrintScreen</key>
	<false/>
	<key>enableQuit</key>
	<true/>
	<key>enableRightClick</key>
	<false/>
	<key>enableVirtualMachineCheck</key>
	<true/>
	<key>hashedAdminPassword</key>
	<string></string>
	<key>hashedQuitPassword</key>
	<string></string>
	<key>insideSebEnableMonitoring</key>
	<true/>
	<key>monitorSecondSelection</key>
	<true/>
	<key>originatorVersion</key>
	<string>SEB_Win_3.1.1</string>
	<key>osXDisableAirPlay</key>
	<true/>
	<key>osXDisableSystemTermination</key>
	<true/>
	<key>quitURL</key>
	<string></string>
	<key>restartExamURL</key>
	<string></string>
	<key>scrollLockCryptoKey</key>
	<string></string>
	<key>sebAndConfigKeySalt</key>
	<string></string>
	<key>sebServicePolicy</key>
	<integer>1</integer>
	<key>sendBrowserExamKey</key>
	<true/>
	<key>showMenuBar</key>
	<false/>
	<key>showTaskBar</key>
	<false/>
	<key>startURL</key>
	<string>${startUrl}</string>
</dict>
</plist>
`;
}
