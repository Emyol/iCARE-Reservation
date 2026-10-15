/** @type {import('next').NextConfig} */
const nextConfig = {
  // The landing page, the old dashboard and the rooms page were replaced by
  // Availability (plus Requests for staff). Temporary redirects keep old links
  // and bookmarks working and leave room to bring a page back.
  async redirects() {
    return ["/", "/dashboard", "/rooms"].map((source) => ({
      source,
      destination: "/availability",
      permanent: false,
    }));
  },
};

export default nextConfig;
