// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   /* config options here */
// };

// export default nextConfig;


/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb', // Allow up to 10MB uploads
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**', // Allow external images if you ever switch back
            },
        ],
    },
};

export default nextConfig;