// Pin the project root: a stray package-lock.json in the home folder otherwise
// makes Next treat ~ as the workspace root and stall scanning it.
const projectRoot = import.meta.dirname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  transpilePackages: ["next-mdx-remote"],
  // Pages folded into the single-page homepage keep working as old links.
  async redirects() {
    return [
      { source: "/about", destination: "/#experience", permanent: false },
      { source: "/blog", destination: "/", permanent: true },
      { source: "/blog/:slug*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
