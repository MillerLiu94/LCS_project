import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const previewRoot = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(previewRoot, "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, previewRoot, "");
  const configuredApi = env.API_BASE_URL;
  if (!configuredApi) throw new Error("Set API_BASE_URL in preview/.env.");

  const apiUrl = new URL(configuredApi);
  if (!/^https?:$/.test(apiUrl.protocol)) {
    throw new Error("API_BASE_URL must use http or https.");
  }
  if (apiUrl.pathname !== "/" && !/^\/api\/?$/i.test(apiUrl.pathname)) {
    throw new Error("API_BASE_URL must be the backend origin, optionally ending in /api.");
  }

  return {
    root: siteRoot,
    envDir: previewRoot,
    plugins: [
      {
        name: "preview-root-redirect",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.split("?", 1)[0] === "/") {
              res.statusCode = 302;
              res.setHeader("Location", "/preview/");
              res.end();
              return;
            }
            next();
          });
        },
      },
    ],
    server: {
      host: "0.0.0.0",
      port: 5500,
      strictPort: true,
      allowedHosts: env.DEV_TUNNEL_HOST ? [env.DEV_TUNNEL_HOST] : [],
      hmr: false,
      proxy: {
        "/api": {
          target: apiUrl.origin,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
