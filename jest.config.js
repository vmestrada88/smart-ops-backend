
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!server.js',
    '!models/db.js'
  ],
  coverageThreshold: {
    global: {
      branches: 44,
      functions: 59,
      lines: 60,
      statements: 58
    }
  }
};