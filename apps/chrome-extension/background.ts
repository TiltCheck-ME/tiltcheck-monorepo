// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
// THE DEGEN LAWS: No emojis. Blunt tone. Math maths.
// This is the brain of the operation. It runs in the background. Don't mess with it.

import { login, getSession, logout } from './auth'; // Get the auth tools.

console.log('TiltCheck background operations initiated. Standing by for commands.');

// Central message dispatcher. Keep it clean.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Authentication commands.
    if (message.action === 'loginDiscord') {
        login().then(session => sendResponse({ success: !!session, session }));
        return true; // Keep the message channel open for async response.
    } else if (message.action === 'getDiscordSession') {
        getSession().then(session => sendResponse({ session }));
        return true;
    } else if (message.action === 'logoutDiscord') {
        logout().then(() => sendResponse({ success: true }));
        return true;
    }

    // Add other feature message handlers here.
    // Example:
    // if (message.action === 'triggerVibeCheck') {
    //   handleVibeCheck(message.userId).then(result => sendResponse(result));
    //   return true;
    // }

    // If no handler, let it pass.
    return false;
});

// Add other background event listeners here (e.g., alarms, install events).
chrome.runtime.onInstalled.addListener(() => {
    console.log('TiltCheck installed. Get ready to secure some wins, degen.');
    // Maybe open a welcome/onboarding page.
    // chrome.tabs.create({ url: 'onboarding.html' });
});

// Example of an alarm listener (for future periodic tasks like bonus checks)
chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'checkBonuses') {
        console.log('Alarm: Time to check for new bonuses. Don\'t miss out.');
        // Call a function to check bonuses.
    }
});

// Set up an alarm for periodic tasks (e.g., every hour)
chrome.alarms.create('checkBonuses', {
    delayInMinutes: 1, // Start 1 minute after install/browser start
    periodInMinutes: 60 // Repeat every 60 minutes
});