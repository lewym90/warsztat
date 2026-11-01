// Konfiguracja lintera: wychwytuje niezdefiniowane nazwy (brak importu) i nieużywane importy.
import globals from 'globals';
export default [{ ignores: ['js/vendor/**'] }, {
  files: ['js/**/*.js', 'tests/**/*.mjs'],
  languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
  rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }], 'no-dupe-keys': 'error', 'no-unreachable': 'error' }
}];
