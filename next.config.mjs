/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react'],
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'pdf-lib'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      {
        source: '/word-to-pdf',
        destination: '/tools',
        permanent: false,
      },
      {
        source: '/pdf-to-word',
        destination: '/tools',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
