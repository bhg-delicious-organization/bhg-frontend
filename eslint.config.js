import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // 瀏覽器
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        AbortController: 'readonly',
        Promise: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        JSON: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MutationObserver: 'readonly',
        Image: 'readonly',
        location: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',

        // Service Worker
        self: 'readonly',
        caches: 'readonly',
        importScripts: 'readonly',
        clients: 'readonly',

        // 第三方 SDK
        OneSignal: 'readonly',
        OneSignalDeferred: 'writable',
        supabase: 'readonly',

        // 你的狀態物件（跨檔案共用）
        AppState: 'readonly',
        TIME: 'readonly',
        UI: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^(_|show|close|confirm|rebind|last|load|init|check|handle|save|remove|update|on|set|toggle|copy|get|view|start|next|skip|end|current)' 
      }],
      'no-undef': 'off',           // ← 你的架構不適合靜態分析
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-fallthrough': 'error',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '**/*.min.js',
      '**/*.min.css',
      'fontawesome*.css',
    ],
  },
];
