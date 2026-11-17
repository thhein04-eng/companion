//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    'shared-calculations',
    'shared-data-access',
    'shared-ui',
    'amortization-calculations',
    'amortization-ui',
    'deal-analyzer-calculations',
    'deal-analyzer-ui',
  ],
};

module.exports = nextConfig;
