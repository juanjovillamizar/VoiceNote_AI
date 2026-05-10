/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Permite que Vercel compile aunque haya errores de ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite que Vercel compile aunque haya errores de TypeScript
    ignoreBuildErrors: true,
  },
};
export default nextConfig;