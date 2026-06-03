/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Remotion server-side imports
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('@remotion/lambda');
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@remotion/lambda', '@remotion/bundler'],
  },
};

module.exports = nextConfig;
