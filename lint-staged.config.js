module.exports = {
  // Run type-check on whole project if any TS file changes
  // (Function syntax prevents passing filenames to the command)
  '**/*.{ts,tsx}': () => 'npm run type-check',

  // Run prettier on staged files
  '**/*': 'prettier --write --ignore-unknown',
};
