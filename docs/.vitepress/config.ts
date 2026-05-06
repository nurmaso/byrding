import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'byrding',
  description:
    'A tiny reactive store with a vanilla-JS core and thin React + Vue adapters.',
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/core' },
      { text: 'Examples', link: '/examples/render-demo' },
      {
        text: 'GitHub',
        link: 'https://github.com/nurmaso/bocal',
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Defining stores', link: '/guide/defining-stores' },
            {
              text: 'Selective subscriptions',
              link: '/guide/selective-subscriptions',
            },
            { text: 'Cross-framework sharing', link: '/guide/cross-framework' },
            { text: 'Agent guidance', link: '/guide/agent-guidance' },
            { text: 'Consumer agent guidance', link: '/guide/consumer-agent-guidance' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API reference',
          items: [
            { text: '@byrding/core', link: '/api/core' },
            { text: '@byrding/react', link: '/api/react' },
            { text: '@byrding/vue', link: '/api/vue' },
          ],
        },
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Render-demo', link: '/examples/render-demo' },
            { text: 'Playground', link: '/examples/playground' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nurmaso/bocal' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © nurmaso',
    },
  },
})
