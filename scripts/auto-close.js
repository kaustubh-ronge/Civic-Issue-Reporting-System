#!/usr/bin/env node

// Simple CLI to run auto-close of expired pending verifications
// Usage: node scripts/auto-close.js

import('../actions/reportActions.js').then(async ({ autoCloseExpiredVerifications }) => {
  try {
    const res = await autoCloseExpiredVerifications()
    console.log('Auto-close result:', res)
    process.exit(0)
  } catch (e) {
    console.error('Auto-close failed', e)
    process.exit(1)
  }
})
