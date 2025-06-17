/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    COLLABORATION_PORT: '4000', // Collaboration server runs on same port as network server
  },
};

export default nextConfig;
