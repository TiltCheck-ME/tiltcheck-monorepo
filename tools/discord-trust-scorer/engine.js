/**
 * Core Scoring Engine
 * 
 * Takes a raw Discord user JSON object and returns the Score, Risk Level, and Reasons.
 */

const BAD_GUILDS = ["1234567890", "9876543210"];

export function analyzeUsername(username) {
    if (!username) return false;
    
    // 1. Catches vowel-less keysmashes (e.g. "gnvjvy")
    const isVowellessSoup = /^[a-zA-Z0-9]{5,15}$/.test(username) && !/[aeiouAEIOU]/.test(username);
    
    // 2. Catches generic generator strings with trailing numbers (e.g. "trilok0683_35359" or "Bob12345")
    const isAutoPadded = /(_\d{4,}|[a-zA-Z]+\d{4,})$/.test(username);

    return isVowellessSoup || isAutoPadded;
}

export function generateTrustScore(user, bannedGuildIds = []) {
    let risk = 0;
    const reasons = [];

    // Map fields from both Raw JSON and Bot Member objects
    const email = user.email;
    const phone = user.phone;
    const verified = user.verified;
    const mfaEnabled = user.mfaEnabled || user.mfa_enabled;
    const hasFlags = (user.publicFlags || 0) > 0 || (user.flags || 0) > 0;
    const presence = user.mobile || user.desktop || user.client_status;
    const username = user.username || "";
    const globalName = user.globalName || user.global_name;
    const primaryGuildId = user.primaryGuild?.identityGuildId || user.guild_id;

    if (!email) { risk += 3; reasons.push("No email"); }
    if (!phone) { risk += 3; reasons.push("No phone"); }
    if (!verified) { risk += 2; reasons.push("Not verified"); }
    if (!mfaEnabled) { risk += 2; reasons.push("No MFA"); }
    if (!presence) { risk += 4; reasons.push("No mobile/desktop login"); }

    if (analyzeUsername(username)) {
        risk += 4; reasons.push("Random-looking username");
    }

    if (!hasFlags) {
        risk += 1; reasons.push("No account flags");
    }

    if (globalName && globalName.toLowerCase() === username.toLowerCase()) {
        risk += 2; reasons.push("globalName matches username");
    }

    if (bannedGuildIds.includes(primaryGuildId)) {
        risk += 5; reasons.push("Matches banned guild identity");
    }

    let riskLevel = "LOW";
    if (risk >= 15) riskLevel = "HIGH";
    else if (risk >= 8) riskLevel = "MEDIUM";

    // Normalize for the legacy 0-100 UI if needed
    const trustScore = Math.max(0, 100 - (risk * 4));

    return {
        discordId: user.id || "unknown",
        trustScore,
        riskScore: risk,
        riskLevel,
        reasons
    };
}
