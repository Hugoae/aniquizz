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
      // Inline the critical shell CSS and keep it first, so the static #app-shell
      // is fully styled on the very first paint with zero extra round-trip.
      // A separate <link href="/app-shell.css"> is a second request that paints
      // the raw shell HTML unstyled for ~0.2s on warm connections (cold-load FOUC).
      name: "app-shell-inline-css",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          let next = html;

          // 1. Inline public/app-shell.css (single source of truth) into <head>.
          //    CSP allows this: style-src includes 'unsafe-inline'.
          const shellCssPath = path.resolve(__dirname, "public/app-shell.css");
          if (fs.existsSync(shellCssPath)) {
            const shellCss = fs.readFileSync(shellCssPath, "utf8").trimEnd();
            next = next.replace(
              /<link rel="stylesheet" href="\/app-shell\.css" \/>/,
              `<style id="app-shell-critical">\n${shellCss}\n    </style>`,
            );
          }

          // 2. Keep the hashed Tailwind bundle right after the critical CSS.
          const cssLink = next.match(
            /<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>/,
          );
          if (cssLink) {
            const tag = cssLink[0];
            next = next.replace(tag, "");
            next = next.replace(
              /(<style id="app-shell-critical">[\s\S]*?<\/style>)/,
              `$1\n    ${tag}`,
            );
          }

          // 3. Body-end module script: head CSS parses before JS executes.
          const moduleScript = next.match(
            /<script type="module"[^>]*src="\/assets\/[^"]+\.js"[^>]*><\/script>/,
          );
          if (moduleScript) {
            const tag = moduleScript[0];
            next = next.replace(tag, "");
            if (!next.includes(tag)) {
              next = next.replace("</body>", `    ${tag}\n  </body>`);
            }
          }

          return next;
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
