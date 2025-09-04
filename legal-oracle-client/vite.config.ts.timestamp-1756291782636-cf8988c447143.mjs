// vite.config.ts
import path from "path";
import react from "file:///C:/Users/Sanjay/legal-oracle-clientv2/legal-oracle-client/node_modules/.pnpm/@vitejs+plugin-react@4.3.4_vite@5.4.19_@types+node@22.14.1_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { defineConfig } from "file:///C:/Users/Sanjay/legal-oracle-clientv2/legal-oracle-client/node_modules/.pnpm/vite@5.4.19_@types+node@22.14.1/node_modules/vite/dist/node/index.js";
import sourceIdentifierPlugin from "file:///C:/Users/Sanjay/legal-oracle-clientv2/legal-oracle-client/node_modules/.pnpm/vite-plugin-source-identifier@1.1.2_vite@5.4.19_@types+node@22.14.1_/node_modules/vite-plugin-source-identifier/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Sanjay\\legal-oracle-clientv2\\legal-oracle-client";
var isProd = process.env.BUILD_MODE === "prod";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: "data-matrix",
      includeProps: true
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxTYW5qYXlcXFxcbGVnYWwtb3JhY2xlLWNsaWVudHYyXFxcXGxlZ2FsLW9yYWNsZS1jbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFNhbmpheVxcXFxsZWdhbC1vcmFjbGUtY2xpZW50djJcXFxcbGVnYWwtb3JhY2xlLWNsaWVudFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvU2FuamF5L2xlZ2FsLW9yYWNsZS1jbGllbnR2Mi9sZWdhbC1vcmFjbGUtY2xpZW50L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIlxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiXG5pbXBvcnQgc291cmNlSWRlbnRpZmllclBsdWdpbiBmcm9tICd2aXRlLXBsdWdpbi1zb3VyY2UtaWRlbnRpZmllcidcblxuY29uc3QgaXNQcm9kID0gcHJvY2Vzcy5lbnYuQlVJTERfTU9ERSA9PT0gJ3Byb2QnXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSwgXG4gICAgc291cmNlSWRlbnRpZmllclBsdWdpbih7XG4gICAgICBlbmFibGVkOiAhaXNQcm9kLFxuICAgICAgYXR0cmlidXRlUHJlZml4OiAnZGF0YS1tYXRyaXgnLFxuICAgICAgaW5jbHVkZVByb3BzOiB0cnVlLFxuICAgIH0pXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbn0pXG5cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVcsT0FBTyxVQUFVO0FBQ3hYLE9BQU8sV0FBVztBQUNsQixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLDRCQUE0QjtBQUhuQyxJQUFNLG1DQUFtQztBQUt6QyxJQUFNLFNBQVMsUUFBUSxJQUFJLGVBQWU7QUFDMUMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sdUJBQXVCO0FBQUEsTUFDckIsU0FBUyxDQUFDO0FBQUEsTUFDVixpQkFBaUI7QUFBQSxNQUNqQixjQUFjO0FBQUEsSUFDaEIsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
