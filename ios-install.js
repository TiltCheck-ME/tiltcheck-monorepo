/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * iOS PWA Install Prompt
 * Detects iOS devices and shows a custom "Add to Home Screen" prompt
 * since iOS does not support the native BeforeInstallPromptEvent.
 */

function isIos() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

function isInStandaloneMode() {
  return ('standalone' in window.navigator) && (window.navigator.standalone);
}

function showIosInstallPrompt() {
  // Check if already dismissed
  if (localStorage.getItem('iosInstallDismissed')) return;

  const prompt = document.createElement('div');
  prompt.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: rgba(20, 20, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    color: white;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: slideUp 0.5s ease-out;
  `;

  prompt.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
      <span style="font-weight:bold; font-size:16px;">Install TiltCheck</span>
      <button id="closeIosPrompt" style="background:none; border:none; color:rgba(255,255,255,0.5); font-size:20px; padding:0;">&times;</button>
    </div>
    <p style="font-size:14px; margin-bottom:12px; opacity:0.9;">Install this app on your iPhone for the best experience. It's free and takes up almost no space.</p>
    <div style="display:flex; align-items:center; gap:10px; font-size:14px;">
      <span>1. Tap</span>
      <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDdmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgM3YxMm0wLTlsLTQtNG00IDRsNCA0TTEyIDE1djZtMCAwSDhNMTIgMjFoNCIvPjwvc3ZnPg==" style="width:20px; height:20px;" />
      <span>Share</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px; font-size:14px; margin-top:5px;">
      <span>2. Scroll down and tap <strong>Add to Home Screen</strong></span>
    </div>
  `;

  document.body.appendChild(prompt);

  document.getElementById('closeIosPrompt').addEventListener('click', () => {
    prompt.remove();
    localStorage.setItem('iosInstallDismissed', 'true');
  });
}

if (isIos() && !isInStandaloneMode()) {
  // Show after a small delay
  setTimeout(showIosInstallPrompt, 3000);
}