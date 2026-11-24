import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'

// 与 MoviePilot 前端共享 vue / vuetify，不在产物里打包基础样式，
// 否则远程 CSS 会注入宿主 <head> 并污染主程序界面。
export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'SubtitleTranslator',
      filename: 'assets/remoteEntry.js',
      exposes: {
        './Page': './src/components/Page.vue',
        './Config': './src/components/Config.vue',
      },
      dts: false,
      shared: {
        vue: { requiredVersion: false, import: false, singleton: true },
        vuetify: { requiredVersion: false, import: false, singleton: true },
        'vuetify/styles': { requiredVersion: false, import: false, singleton: true },
      },
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: true,
    outDir: '../dist',
    emptyOutDir: true,
  },
  css: {
    postcss: {
      plugins: [
        {
          postcssPlugin: 'vuetify-filter',
          Root(root) {
            const sourcePath = (root.source?.input?.file || '').replaceAll('\\', '/')
            if (sourcePath.includes('/node_modules/vuetify/') || sourcePath.includes('/node_modules/@mdi/')) {
              root.nodes = []
              return
            }
            root.walkRules(rule => {
              if (rule.selector && (rule.selector.includes('.v-') || rule.selector.includes('.mdi-'))) {
                rule.remove()
              }
            })
          },
        },
      ],
    },
  },
})
