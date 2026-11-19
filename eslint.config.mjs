import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/test-output',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // Spec 003 (contracts/module-boundaries.md): features never import each
          // other, shared code knows no feature, and logic sits below state below UI.
          depConstraints: [
            {
              sourceTag: 'scope:app',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:amortization',
                'scope:deal-analyzer',
              ],
            },
            {
              sourceTag: 'scope:amortization',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:amortization'],
            },
            {
              sourceTag: 'scope:deal-analyzer',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:deal-analyzer'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:data-access',
                'type:calc',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:data-access',
                'type:calc',
              ],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:calc'],
            },
            {
              sourceTag: 'type:calc',
              onlyDependOnLibsWithTags: ['type:calc'],
            },
            {
              sourceTag: 'type:e2e',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
    },
  },
  {
    // Spec 010 FR-011 / FR-035 (contracts/design-system.md): UI colors come only from the design
    // tokens. Raw Tailwind palette classes, and `faint` as a text color, are blocked.
    files: ['**/src/**/*.tsx'],
    ignores: ['**/*.spec.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/(^|[\\s:"`])(bg|text|border|ring|outline|fill|stroke|divide|from|to|shadow)-(neutral|gray|slate|zinc|stone|red|emerald|green|amber|yellow|sky|blue|rose|orange|black|white)(-[0-9]{2,3})?([\\s"`/]|$)/]',
          message:
            'Use design tokens (contracts/design-system.md), not raw palette classes.',
        },
        {
          selector:
            'TemplateElement[value.raw=/(^|[\\s:"`])(bg|text|border|ring|outline|fill|stroke|divide|from|to|shadow)-(neutral|gray|slate|zinc|stone|red|emerald|green|amber|yellow|sky|blue|rose|orange|black|white)(-[0-9]{2,3})?([\\s"`/]|$)/]',
          message:
            'Use design tokens (contracts/design-system.md), not raw palette classes.',
        },
        {
          selector: 'Literal[value=/(^|[\\s:])text-faint([\\s/]|$)/]',
          message: 'faint is decoration-only (spec 010 FR-035); use text-muted.',
        },
        {
          selector: 'TemplateElement[value.raw=/(^|[\\s:])text-faint([\\s/]|$)/]',
          message: 'faint is decoration-only (spec 010 FR-035); use text-muted.',
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
