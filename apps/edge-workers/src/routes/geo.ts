export function handleGeoCompliance(request: Request): Response | null {
    // Cloudflare injects geo information into request.cf
    const cf = request.cf as { country?: string; isEUCountry?: string };
    if (!cf) return null;

    // List of blocked jurisdictions (e.g., sanctioned countries or areas where un-licensed operations are not allowed)
    const restrictedJurisdictions = ['CU', 'IR', 'KP', 'SY', 'BY', 'RU'];

    const country = cf.country || '';

    if (restrictedJurisdictions.includes(country)) {
        return new Response(JSON.stringify({
            error: 'Access Restricted',
            message: 'TiltCheck is not available in your jurisdiction due to compliance restrictions.'
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Allowed to proceed
    return null;
}
