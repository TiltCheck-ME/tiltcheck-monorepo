/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */



/**

 * Core content script — pace-locks spins when enforcement is on.

 * Pro monolith (sidebar, extractor, strategic filters) lazy-loads when

 * `tiltcheck_pro_monolith_enabled === true` and tears down on flag off.

 */



function isDomain(hostname: string, domain: string): boolean {

  return hostname === domain || hostname.endsWith('.' + domain);

}



const hostname = window.location.hostname.toLowerCase();

const pathname = window.location.pathname.toLowerCase();

const isDiscordAuthRoute = pathname.startsWith('/auth/discord');



const isExcludedDomain =

  isDomain(hostname, 'discord.com') ||

  (hostname === 'localhost' && window.location.port === '3333') ||

  (hostname === 'localhost' && window.location.port === '3001' && isDiscordAuthRoute) ||

  (isDomain(hostname, 'api.tiltcheck.me') && isDiscordAuthRoute);



if (isExcludedDomain) {

  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {

    console.log('[TiltCheck] Skipping - excluded domain:', hostname);

  }

}



import {

  CORE_CIRCUIT_BREAKER_STORAGE_KEYS,

  loadCoreCircuitBreakerOptions,

  type CoreCircuitBreakerOptions,

} from './core-options.js';

import { installSpinPaceLock, type PaceLockHandle } from './spin-pace-lock.js';
import { installLoungeOverlay } from './lounge-overlay.js';



/** When `true`, loads the legacy full extension (`pro-monolith-bootstrap.js`). */

export const TILTCHECK_PRO_MONOLITH_KEY = 'tiltcheck_pro_monolith_enabled';

/** Pro still dispatches this. Core ignores it. */
export const TILTCHECK_CORE_RECORD_BET_EVENT = 'tiltcheck-core-record-bet';



type ProMonolithModule = {

  startProMonolith: () => Promise<void>;

  deactivateProMonolith: () => void;

};



type TiltCheckWindow = Window & { __tiltcheckCoreShieldActive?: boolean };



let paceLock: PaceLockHandle | null = null;

let coreOptions: CoreCircuitBreakerOptions | null = null;

let proModulePromise: Promise<ProMonolithModule> | null = null;

let proActive = false;



async function waitForDocumentEnd(): Promise<void> {

  if (document.readyState !== 'loading' && document.body) {

    return;

  }



  await new Promise<void>((resolve) => {

    const resolveWhenReady = () => {

      if (document.body) {

        document.removeEventListener('DOMContentLoaded', resolveWhenReady);

        resolve();

      }

    };

    document.addEventListener('DOMContentLoaded', resolveWhenReady, { once: true });

    setTimeout(resolveWhenReady, 0);

  });

}



async function shouldLoadProMonolith(): Promise<boolean> {

  try {

    const stored = await chrome.storage.local.get(TILTCHECK_PRO_MONOLITH_KEY);

    return stored[TILTCHECK_PRO_MONOLITH_KEY] === true;

  } catch {

    return false;

  }

}



async function loadProModule(): Promise<ProMonolithModule> {

  if (!proModulePromise) {

    proModulePromise = import(

      chrome.runtime.getURL('pro-monolith-bootstrap.js')

    ) as Promise<ProMonolithModule>;

  }

  return proModulePromise;

}



async function setProMonolithEnabled(enabled: boolean): Promise<void> {

  if (enabled) {

    if (proActive) return;

    const mod = await loadProModule();

    await mod.startProMonolith();

    proActive = true;

    return;

  }



  if (!proActive) return;

  const mod = await loadProModule();

  mod.deactivateProMonolith();

  proActive = false;

}



async function refreshCoreOptions(): Promise<CoreCircuitBreakerOptions> {

  coreOptions = await loadCoreCircuitBreakerOptions();

  return coreOptions;

}



function installCoreOptionsListener(): void {

  try {

    chrome.storage.onChanged.addListener((changes, area) => {

      if (area !== 'local') return;



      if (TILTCHECK_PRO_MONOLITH_KEY in changes) {

        const enabled = changes[TILTCHECK_PRO_MONOLITH_KEY]?.newValue === true;

        void setProMonolithEnabled(enabled);

      }



      const coreKeyTouched = CORE_CIRCUIT_BREAKER_STORAGE_KEYS.some((k) => k in changes);

      if (coreKeyTouched) {

        void refreshCoreOptions().then((opts) => {

          syncPaceLock(opts.enforcementEnabled);

        });

      }

    });

  } catch {

    // Storage listener unavailable in some test harnesses.

  }

}



function syncPaceLock(enabled: boolean): void {

  if (enabled && !paceLock) {

    paceLock = installSpinPaceLock();

    return;

  }

  if (!enabled && paceLock) {

    paceLock.stop();

    paceLock = null;

  }

}



async function startCoreCircuitBreaker(): Promise<void> {

  await waitForDocumentEnd();

  const opts = await refreshCoreOptions();

  installCoreOptionsListener();

  (window as TiltCheckWindow).__tiltcheckCoreShieldActive = true;

  syncPaceLock(opts.enforcementEnabled);

}



async function boot(): Promise<void> {

  if (isExcludedDomain) {

    return;

  }



  await startCoreCircuitBreaker();
  installLoungeOverlay();



  if (await shouldLoadProMonolith()) {

    await setProMonolithEnabled(true);

  }

}



void boot();



chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (isExcludedDomain && message.type !== 'get_sidebar_state') {

    sendResponse({ error: 'Feature disabled on this domain' });

    return true;

  }



  if (

    proActive &&

    (message.type === 'toggle_sidebar' ||

      message.type === 'open_sidebar' ||

      message.type === 'get_sidebar_state')

  ) {

    return false;

  }



  switch (message.type) {

    case 'toggle_sidebar':

    case 'open_sidebar':

      sendResponse({

        success: false,

        coreOnly: true,

        hint: 'Set tiltcheck_pro_monolith_enabled to true in chrome.storage.local to load the full TiltCheck panel.',

      });

      return true;

    case 'get_sidebar_state':

      sendResponse({

        exists: false,

        visible: false,

        injectionDisabled: false,

        coreOnly: true,

      });

      return true;

    default:

      return false;

  }

});



if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {

  console.log('[TiltCheck] Core content script loaded');

}


