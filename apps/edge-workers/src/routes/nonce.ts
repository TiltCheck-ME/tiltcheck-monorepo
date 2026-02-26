export function handleNonceGeneration(request: Request): Response {
    // Ensure it's a GET or POST request
    if (request.method !== 'GET' && request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // Generate a high-speed secure nonce via Web Crypto API natively on the edge
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);

    // Convert to hex string
    const nonce = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return new Response(JSON.stringify({
        nonce,
        generatedAt: Date.now()
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        }
    });
}
