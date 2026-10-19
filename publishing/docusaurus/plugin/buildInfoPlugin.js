module.exports = function buildInfoPlugin() {
  const {
    RELEASE_TAG = 'dev',
    COMMIT_SHA = 'local',
    BUILD_DATE = '',
  } = process.env;

  return {
    name: 'build-info-plugin',
    injectHtmlTags() {
      const json = JSON.stringify({RELEASE_TAG, COMMIT_SHA, BUILD_DATE});
      return {
        headTags: [
          { tagName: 'meta', attributes: { name: 'x-build-release', content: RELEASE_TAG }},
          { tagName: 'meta', attributes: { name: 'x-build-commit',  content: COMMIT_SHA }},
          { tagName: 'meta', attributes: { name: 'x-build-date',    content: BUILD_DATE }},
          { tagName: 'script', innerHTML: `window.__BUILD_INFO__=${json};` },
        ],
      };
    },
  };
};