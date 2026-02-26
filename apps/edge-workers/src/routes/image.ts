export function handleImageOptimization(request: Request): Promise<Response> | Response {
    const url = new URL(request.url);
    const sourceImage = url.searchParams.get('src');
    const widthStr = url.searchParams.get('w');
    const qualityStr = url.searchParams.get('q');

    if (!sourceImage) {
        return new Response('Missing source image url ?src=', { status: 400 });
    }

    // Ensure it's pointing to a trusted domain for resize (e.g., your own CDN, or trusted static buckets)
    if (!sourceImage.startsWith('https://tiltcheck.com') && !sourceImage.startsWith('https://cdn.tiltcheck.com')) {
        return new Response('Untrusted image source.', { status: 403 });
    }

    const w = widthStr ? parseInt(widthStr, 10) : 800;
    const q = qualityStr ? parseInt(qualityStr, 10) : 80;

    // Cloudflare Workers Image Resizing API:
    // Requires your zone to be on a Business plan or Pro plan with Images enabled,
    // then configured via fetch option. We pass these parameters cleanly:
    const imageRequest = new Request(sourceImage, {
        headers: request.headers,
    });

    return fetch(imageRequest, {
        // Note: The cf object only types correctly if your workers account has options set,
        // but this uses standard Cloudflare Image Resizing arguments
        cf: {
            image: {
                width: w,
                quality: q,
                fit: 'scale-down',
                format: 'auto' as any, // AVIF or WebP typically
            }
        }
    });
}
