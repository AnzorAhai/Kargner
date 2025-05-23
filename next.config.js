const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  swSrc: 'service-worker.js',
  swDest: 'service-worker.js'
});

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
}); 