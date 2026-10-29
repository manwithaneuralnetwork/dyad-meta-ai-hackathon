import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dyad",
    short_name: "Dyad",
    description: "Find something worth showing up for.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3e9",
    theme_color: "#0d8b73",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
  };
}
