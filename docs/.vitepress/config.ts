import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'byrding',
  description:
    'A tiny reactive store with a vanilla-JS core and thin React + Vue adapters.',
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/react' },
      { text: 'Internals', link: '/internals/architecture' },
      { text: 'Examples', link: '/examples/render-demo' },
      {
        text: 'GitHub',
        link: 'https://github.com/nurmaso/byrding',
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
            { text: 'Composing stores', link: '/guide/composing-stores' },
            { text: 'Plugins', link: '/guide/plugins' },
            { text: 'Devtools', link: '/guide/devtools' },
          ],
        },
        {
          text: 'For AI agents',
          items: [
            { text: 'Consumer agent guidance', link: '/guide/consumer-agent-guidance' },
            { text: 'Refactor agent guidance', link: '/guide/agent-guidance' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API reference',
          items: [
            { text: '@byrding/react', link: '/api/react' },
            { text: '@byrding/vue', link: '/api/vue' },
            { text: '@byrding/core', link: '/api/core' },
          ],
        },
      ],

      '/internals/': [
        {
          text: 'Internals',
          items: [
            { text: 'Architecture', link: '/internals/architecture' },
            { text: 'StoreInstance and subscriptions', link: '/internals/store-instance' },
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
      { icon: 'github', link: 'https://github.com/nurmaso/byrding' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © nurmaso',
    },
  },
})
