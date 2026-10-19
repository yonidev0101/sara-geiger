/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // When a new version is deployed, pages still open from the old version
  // reload themselves instead of mixing old and new code.
  deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
};

export default nextConfig;
