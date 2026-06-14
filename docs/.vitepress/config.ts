import { defineConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'

// 教程站点配置。侧边栏的「课程」顺序即「由浅入深」的学习路径。
export default defineConfig({
  title: 'Rx 电梯学院',
  description: '用一座真实电梯，由浅入深地建立 RxJS 的思维模型',
  lang: 'zh-CN',
  // 部署在 GitHub Pages 项目页（doodlewind.github.io/rx-elevator-demo/）下，
  // 需要带上仓库名作为基路径，资源与内链才能正确解析。
  base: '/rx-elevator-demo/',
  cleanUrls: true,
  lastUpdated: true,
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('../../src', import.meta.url)),
      },
    },
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '教程', link: '/guide/intro' },
      { text: 'Playground', link: '/playground' },
      { text: '速查表', link: '/guide/cheatsheet' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始之前',
          items: [
            { text: '为什么用电梯学 RxJS', link: '/guide/intro' },
            { text: '思维模型：一切皆是流', link: '/guide/mental-model' },
            { text: '如何看懂弹珠图', link: '/guide/marble-basics' },
          ],
        },
        {
          text: '由浅入深 · 9 课',
          items: [
            { text: 'L1 · 一个按钮，一条流', link: '/guide/l1-button-stream' },
            { text: 'L2 · 让电梯动起来', link: '/guide/l2-interval-move' },
            { text: 'L3 · 一次只服务一个请求', link: '/guide/l3-switchmap' },
            { text: 'L4 · 上行还是下行', link: '/guide/l4-direction' },
            { text: 'L5 · 排队：累积请求', link: '/guide/l5-scan-queue' },
            { text: 'L6 · SCAN 调度算法', link: '/guide/l6-scan-algorithm' },
            { text: 'L7 · 多部电梯协同', link: '/guide/l7-multi-car' },
            { text: 'L8 · 真实世界的细节', link: '/guide/l8-real-world' },
            { text: 'L9 · 完整模拟器', link: '/guide/l9-full-sim' },
          ],
        },
        {
          text: '附录',
          items: [
            { text: 'RxJS 操作符速查表', link: '/guide/cheatsheet' },
            { text: '常见误区与陷阱', link: '/guide/pitfalls' },
          ],
        },
      ],
    },
    outline: { level: [2, 3], label: '本页大纲' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/doodlewind/rx-elevator-demo' },
    ],
    docFooter: { prev: '上一课', next: '下一课' },
    darkModeSwitchLabel: '主题',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
  },
})
