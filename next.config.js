// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'phimimg.com' },
      { protocol: 'https', hostname: 'img.ophim.live' },
      { protocol: 'https', hostname: 'media.themoviedb.org' }
    ]
  }
};
module.exports = nextConfig;
