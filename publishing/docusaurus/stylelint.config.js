// stylelint.config.js
module.exports = {
  extends: ["stylelint-config-standard"],
  rules: {
    // povol drobné veci, ktoré nechceš riešiť hneď
    "no-empty-source": null,                 // nevadí prázdny css
    "selector-class-pattern": null,          // neobmedzuj názvy tried
    "color-function-notation": "legacy",     // nechaj staršie rgb zápisy
    "alpha-value-notation": "number",        // povol .5 namiesto 50%
  },
  ignoreFiles: [
    "build/**/*.css",
    "node_modules/**/*.css",
  ],
};