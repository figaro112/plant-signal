import type {Config} from '@docusaurus/types';
import {themes as prismThemes} from 'prism-react-renderer';

const {
  RELEASE_TAG = 'dev',
  COMMIT_SHA = 'local',
  BUILD_DATE = '',
  GITHUB_REPO_URL = '',
  SITE_URL = 'https://knife-framework.github.io',
  BASE_URL = '/knifes_overview/',
} = process.env;

const commitLink =
  GITHUB_REPO_URL && COMMIT_SHA ? `${GITHUB_REPO_URL}/commit/${COMMIT_SHA}` : '';

const config: Config = {
  title: 'KNIFE - STHDF 2026-2027 - Student Template',
  url: SITE_URL,
  baseUrl: BASE_URL,
  deploymentBranch: 'gh-pages',
  favicon: 'img/favicon.ico',

  i18n: {
    defaultLocale: 'sk',
    locales: ['sk', 'en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.ts'),
          includeCurrentVersion: true,
          editCurrentVersion: false,
          // zobrazíme konkrétny dokument ako homepage, aby sa hneď ukázal sidebar
          //homePageId: 'sk/index',
          // aktivujeme tag stránky pre dokumentáciu a presunieme ich z default /tags na /doc-tags,
          // aby nebol konflikt s blogom (ak by sa neskôr zapol)
          // dočasne vypínam pre warning v builde 21.11.2025,//tagsBasePath: 'doc-tags',
        },
        // Blog nepoužívame – vypneme, aby nevznikal duplicitný /tags
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') },
      },
    ],
  ],

  // (Optional) Plugins — buildInfoPlugin disabled (file not present)
  plugins: [],

  themeConfig: {
    docs: {
      sidebar: {
        hideable: true,              // umožní používateľovi zložiť/rozbaliť sidebar
        autoCollapseCategories: false, // nechávame sekcie otvorené (Home uvidí celý strom)
      },
    },
    navbar: {
      title: 'KNIFE - STHDF 2026-2027 - Student Template',
      logo: {
        alt: 'KNIFE',
        src: 'img/logo.png',
        srcDark: 'img/logo-dark.png',
        target: '_self', // alebo '_blank' ak chceš nové okno
        href: '/', // ← sem vložíš svoj cieľový link
      },
      items: [
        { type: 'localeDropdown', position: 'left' },
        { to: '/sk/about', label: 'About', position: 'right' },
        { to: '/sk/help',  label: 'Help',  position: 'right' },
        {
          href: commitLink || '#',
          label: `Release ${RELEASE_TAG} • ${COMMIT_SHA}`,
          position: 'right',
        },
      ],
    },

    // Announcement bar hore (možno kedykoľvek vypnúť/komentovať)
   // announcementBar: {
    //  id: 'build_info',
    //  content: commitLink
    //    ? `🔖 <strong>Release:</strong> ${RELEASE_TAG} &nbsp;•&nbsp; <strong>Commit:</strong> <a href="${commitLink}" target="_blank" rel="noopener noreferrer">${COMMIT_SHA}</a> &nbsp;•&nbsp; <strong>Build:</strong> ${BUILD_DATE}`
    //    : `🔖 <strong>Release:</strong> ${RELEASE_TAG} &nbsp;•&nbsp; <strong>Commit:</strong> ${COMMIT_SHA} &nbsp;•&nbsp; <strong>Build:</strong> ${BUILD_DATE}`,
   //   backgroundColor: '#f7f70aff',
    //  textColor: '#091E42',
   //   isCloseable: true,
   // },

    footer: {
      style: 'dark',
      copyright: `
  <div style="text-align:center;">
    © ${new Date().getFullYear()} SystemThinking<br/>
    🔖 Release: <strong>${RELEASE_TAG}</strong><br/>
    💡 Commit: <code>${COMMIT_SHA}</code><br/>
    🕒 Build: ${BUILD_DATE}
  </div>
`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },

  future: {
    experimental_faster: false, // disables experimental minifier causing build crashes
  },
};

export default config;