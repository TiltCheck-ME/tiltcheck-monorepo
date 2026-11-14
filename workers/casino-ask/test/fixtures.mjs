// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Short quotes from Acebet.cc's own pages (read 2026-11-13), trimmed for tests.

const page = (title, body) =>
  `<!doctype html><html><head><title>${title}</title><script>window.__x = "redeem freeze 999 days";</script><style>.a{}</style></head>` +
  `<body><nav>Casino Sports Promotions</nav><main><h1>${title}</h1>${body}</main><footer>Footer links</footer></body></html>`;

export const ACEBET_PAGES = {
  'https://acebet.cc/redemptions': page(
    'Acebet.cc Redemptions',
    '<p>Sweeps Coins won in play can be redeemed for prizes at a rate of 1 SC to 1 USD once you have met the playthrough rule and completed identity verification.</p>' +
      '<p>Payouts go to Bitcoin, Litecoin, Ethereum, Solana, Tether (ERC20), Visa, Mastercard, SEPA, Bank Transfer, or ACH, with minimums starting at 50 SC and provider fees of 2.50% to 4.00%.</p>' +
      '<p>Minimums start at 50 SC per redemption and the daily cap is 9,500 SC.</p>' +
      '<p>How long a payout takes to arrive depends on the method, and processing times are not guaranteed (Promotional Play Rules, section 8).</p>',
  ),
  'https://acebet.cc/policies/promotional-play-policy': page(
    'Acebet.cc Promotional Play Rules',
    '<p>9. Prizes and Prize Redemption. You acknowledge and agree that in some circumstances it may take up to 30 days to process the payment of any redeemed Prizes to you.</p>' +
      '<p>Redemption of prizes may experience delays due to our identity verification process. Prizes of $600 or more may require a longer processing time than usual due to security and fraud checks.</p>' +
      '<p>Any Sweeps Coins credited to a Participant&rsquo;s User Account that has not been used to play a Sweeps Coins game within ninety (90) days after the date they were credited will automatically expire.</p>',
  ),
  'https://acebet.cc/policies/terms-of-service': page(
    'Acebet.cc Terms of Service',
    '<p>6.12 Our Customer Support can be contacted twenty-four hours a day, seven days a week via live chat on the Platform. A response may in certain circumstances take up to twenty-four (24) hours.</p>' +
      '<p>2.5 Delux Trading Cards. Physical trading cards are offered for sale through the Platform and through our standalone website.</p>',
  ),
  'https://acebet.cc/faq/service-availability': page(
    'Acebet.cc Service Availability',
    '<p>Acebet.cc is not available in every state. Check the list of restricted states before you sign up.</p>',
  ),
};

export const REPORTS = { updated: 1794608176693, minReporters: 3, casinos: { acebet: [{ category: 'withdrawal_delay', label: 'Slow withdrawal', reporters: 4 }] } };

/** fetch stand-in: Acebet pages, the reports summary, and a scripted Groq reply. */
export function fakeFetch({ groq, calls = [], failPages = false } = {}) {
  return async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.startsWith('https://api.groq.com/')) {
      if (typeof groq === 'function') return groq(JSON.parse(init.body));
      if (groq instanceof Error) throw groq;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(groq || {}) } }] }), { status: 200 });
    }
    if (u.includes('/casino-reports/summary')) return new Response(JSON.stringify(REPORTS), { status: 200 });
    if (u.startsWith('https://discord.com/')) return new Response('{}', { status: 200 });
    if (!failPages && ACEBET_PAGES[u]) return new Response(ACEBET_PAGES[u], { status: 200, headers: { 'content-type': 'text/html' } });
    return new Response('blocked', { status: 403 });
  };
}
