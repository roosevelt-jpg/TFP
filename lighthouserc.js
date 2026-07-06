// Category scores gate real defects; performance is warn-only because scores
// jitter on shared CI runners — watch real-user perf in Vercel Speed Insights.
module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start",
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/join",
        "http://localhost:3000/faq",
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        "categories:performance": ["warn", { minScore: 0.8 }],
        "errors-in-console": "error",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "lighthouse-report",
    },
  },
};
