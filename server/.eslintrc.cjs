module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['security'],
  extends: [
    'eslint:recommended',
    'plugin:security/recommended-legacy',
  ],
  rules: {
    // Allow console in server code (logging is intentional)
    'no-console': 'off',
    // The security plugin flags non-literal require() — we use it intentionally for pdf-parse
    'security/detect-non-literal-require': 'warn',
    // Flag eval and similar patterns
    'security/detect-eval-with-expression': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    // Regex DoS detection
    'security/detect-unsafe-regex': 'error',
    // Object injection (bracket notation with variable keys)
    'security/detect-object-injection': 'off', // Too many false positives with arrays
    // Buffer allocation without fill
    'security/detect-new-buffer': 'error',
    // No unused vars (allow underscore-prefixed)
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: [
    'node_modules/',
    '*.test.js',
  ],
};
