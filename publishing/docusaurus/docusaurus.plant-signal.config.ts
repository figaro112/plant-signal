import type {Config} from '@docusaurus/types';
import {themes} from 'prism-react-renderer';
// Project-only preview. Upstream configuration is retained unchanged.
const config: Config = {
  title: 'PlantSignal — STHDF',
  tagline: 'A desk plant reminder: concept, design and evidence',
  url: 'https://figaro112.github.io',
  baseUrl: '/plant-signal/',
  organizationName: 'figaro112',
  projectName: 'plant-signal',
  onBrokenLinks: 'throw',
  staticDirectories: ['static-plant-signal'],
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [['classic', {
    docs: {path: 'docs', routeBasePath: '/', sidebarPath: require.resolve('./sidebars.plant-signal.ts')},
    blog: false,
    theme: {customCss: require.resolve('./src/css/custom.css')},
  }]],
  themeConfig: {
    navbar: {title: 'PlantSignal', items: [
      {to: '/', label: 'Project', position: 'left'},
      {href: 'https://github.com/figaro112/plant-signal', label: 'GitHub (private)', position: 'right'},
    ]},
    footer: {style: 'dark', copyright: 'PlantSignal · Marek Hužvar · Matuš Plško · Richard Sič · STHDF 2026–2027'},
    prism: {theme: themes.github, darkTheme: themes.dracula},
  },
};
export default config;
