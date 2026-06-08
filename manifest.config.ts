import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

const icons = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

export default defineManifest({
  manifest_version: 3,
  name: 'Prompt Queue for ChatGPT',
  description: 'Queue prompts for ChatGPT and auto-send the next one when the current response finishes. Not affiliated with OpenAI.',
  version: pkg.version,
  homepage_url: pkg.homepage,
  icons,
  host_permissions: ['https://chatgpt.com/*'],
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle',
    },
  ],
  action: {
    default_title: 'Prompt Queue for ChatGPT',
    default_icon: icons,
    default_popup: 'src/popup/index.html',
  },
});
