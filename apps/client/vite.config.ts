import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    {
      name: "app-shell-css-first",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          const cssLink = html.match(
            /<link rel="stylesheet" crossorigin href="\/assets\/[^"]+\.css">/,
          );
          if (!cssLink) return html;
          const tag = cssLink[0];
          const without = html.replace(tag, "");
          return without.replace(
            /(<link rel="stylesheet" href="\/app-shell\.css" \/>)/,
            `$1\n    ${tag}`,
          );
        },
      },
    },
    {
      name: "perf-preloads",
      apply: "build",
      closeBundle() {
        const indexPath = path.resolve(__dirname, "dist/index.html");
        if (!fs.existsSync(indexPath)) return;
        const assetsDir = path.resolve(__dirname, "dist/assets");
        const html = fs.readFileSync(indexPath, "utf8");
        const tags: string[] = [];

        for (const file of fs.readdirSync(assetsDir)) {
          if (/^Home-.*\.js$/.test(file)) {
            tags.push(`<link rel="modulepreload" crossorigin href="/assets/${file}">`);
          }
          if (/bricolage-grotesque-latin-800-normal.*\.woff2$/i.test(file)) {
            tags.push(
              `<link rel="preload" href="/assets/${file}" as="font" type="font/woff2" crossorigin>`,
            );
          }
        }

        if (!tags.length) return;
        let next = html.replace(
          /<link rel="modulepreload" crossorigin href="\/assets\/vendor-supabase[^"]+">\n?/g,
          "",
        );
        next = next.replace(
          /<link rel="modulepreload" crossorigin href="\/assets\/vendor-recharts[^"]+">\n?/g,
          "",
        );
        next = next.replace("</head>", `    ${tags.join("\n    ")}\n  </head>`);
        fs.writeFileSync(indexPath, next);
      },
    },
    mode === "development" && componentTagger(),
    process.env.ANALYZE === "1" &&
      visualizer({
        filename: "dist/bundle-stats.html",
        gzipSize: true,
        open: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@aniquizz/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("recharts") || id.includes("d3-")) return "vendor-recharts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("socket.io")) return "vendor-socket";
          // Keep Radix in the React chunk — a separate vendor-radix chunk creates a
          // circular import with vendor-react and crashes prod (forwardRef undefined).
          if (
            id.includes("@radix-ui") ||
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("/react/")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
}));
