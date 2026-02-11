/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // 1. This handles the Server Action limit
        serverActions: {
            bodySizeLimit: '5000mb',
        },
        // 2. This handles the Middleware/Proxy limit (Next.js 16 specific)
        proxyClientMaxBodySize: '5000mb', 
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
};

export default nextConfig;