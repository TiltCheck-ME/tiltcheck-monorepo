// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
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

function normalizeGuildIds(rawGuilds) {
    if (!Array.isArray(rawGuilds)) return [];
    return rawGuilds.flatMap((entry) => {
        if (!entry) return [];
        if (typeof entry === 'string' || typeof entry === 'number') {
            return [String(entry)];
        }
        if (typeof entry === 'object') {
            return [
                entry.id,
                entry.guild_id,
                entry.guildId,
                entry.identityGuildId,
            ].filter(Boolean).map((value) => String(value));
        }
        return [];
    });
}

export function generateTrustScore(user, guildIds = [], options = {}) {
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
    const blacklistGuildIds = new Set([
        ...BAD_GUILDS,
        ...normalizeGuildIds(options.bannedGuildIds),
    ]);
    const observedGuildIds = new Set([
        ...normalizeGuildIds(guildIds),
        ...normalizeGuildIds(user.guilds),
        ...normalizeGuildIds(user.mutual_guilds),
        ...(primaryGuildId ? [String(primaryGuildId)] : []),
    ]);

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

    const overlappingGuilds = [...observedGuildIds].filter((guildId) => blacklistGuildIds.has(guildId));
    if (overlappingGuilds.length > 0) {
        risk += 5;
        reasons.push(`Guild overlap with blacklist (${overlappingGuilds.length})`);
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
