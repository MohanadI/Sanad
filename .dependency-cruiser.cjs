/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-ai-to-tool-references',
      comment: 'CRITICAL: Intent classifier (AI/NLP) must have zero awareness of tool executors or policy engine',
      severity: 'error',
      from: {
        path: '^backend/packages/intent-classifier',
      },
      to: {
        path: '^backend/packages/(tool-executors|policy-engine)',
      },
    },
    {
      name: 'no-tool-to-policy-or-ai',
      comment: 'Tool executors must not import policy-engine or intent-classifier',
      severity: 'error',
      from: {
        path: '^backend/packages/tool-executors',
      },
      to: {
        path: '^backend/packages/(policy-engine|intent-classifier)',
      },
    },
    {
      name: 'no-policy-to-ai-or-tools',
      comment: 'Policy engine must not import intent-classifier or tool-executors directly',
      severity: 'error',
      from: {
        path: '^backend/packages/policy-engine',
      },
      to: {
        path: '^backend/packages/(intent-classifier|tool-executors)',
      },
    },
    {
      name: 'common-leaf-dependency',
      comment: 'Common must remain a pure leaf dependency and not import other internal packages',
      severity: 'error',
      from: {
        path: '^backend/packages/common',
      },
      to: {
        path: '^backend/packages/(intent-classifier|policy-engine|tool-executors|audit-log)',
      },
    },
    {
      name: 'no-circular',
      comment: 'Circular dependencies are strictly forbidden',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'backend/tsconfig.json',
    },
  },
};
