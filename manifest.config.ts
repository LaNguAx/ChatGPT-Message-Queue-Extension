import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'ChatGPT Queue',
  description: 'Queue prompts for ChatGPT; auto-send the next one when the current response finishes.',
  version: pkg.version,
  host_permissions: ['https://chatgpt.com/*'],
  permissions: ['storage'],
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle',
    },
  ],
  action: { default_title: 'ChatGPT Queue' },
});
