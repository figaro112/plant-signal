import fs from 'fs';
import path from 'path';

export function loadKnifesConfig() {
  const envConfig = {
    csvPath: process.env.KNIFES_CSV,
    repoRoot: process.env.KNIFES_ROOT,
    locale: process.env.KNIFES_LOCALE,
  };

  let fileConfig = {};
  const configFilePath = path.resolve('config/knifes.config.json');
  if (fs.existsSync(configFilePath)) {
    try {
      const rawData = fs.readFileSync(configFilePath, 'utf-8');
      const parsed = JSON.parse(rawData);
      fileConfig.csvPath = parsed.csvPath;
      fileConfig.repoRoot = parsed.repoRoot;
      fileConfig.locale = parsed.locale;
    } catch (e) {
      // Ignore JSON parse errors or read errors, fallback to defaults
    }
  }

  const config = {
    csvPath: envConfig.csvPath || fileConfig.csvPath || 'data/KNIFES-OVERVIEW-INPUTS.csv',
    repoRoot: envConfig.repoRoot || fileConfig.repoRoot || '.',
    locale: envConfig.locale || fileConfig.locale || 'sk',
  };

  return config;
}
