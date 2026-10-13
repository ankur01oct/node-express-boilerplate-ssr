import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeLoanInputs } from '../public/loan-model.js';
import { renderFullHtmlDocument } from './render-page.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Read CSS synchronously at startup for inlining into DSD
const cssPath = path.join(__dirname, 'styles.css');
const serverCss = fs.readFileSync(cssPath, 'utf8');

// Parse URL-encoded forms for no-JS fallback submissions
app.use(express.urlencoded({ extended: true }));

// Standard Security Headers + CSP
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Serve client assets from public directory
app.use('/public', express.static(path.join(rootDir, 'public')));

/**
 * GET /
 * Server-rendered initial calculator experience
 */
app.get('/', (req, res) => {
  const params = sanitizeLoanInputs(
    req.query.amount,
    req.query.term,
    req.query.credit
  );
  const html = renderFullHtmlDocument(params, serverCss);
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
});

/**
 * POST /calculate
 * Progressive enhancement fallback endpoint when client JavaScript is absent
 */
app.post('/calculate', (req, res) => {
  const params = sanitizeLoanInputs(
    req.body.amount,
    req.body.term,
    req.body.credit
  );
  const html = renderFullHtmlDocument(params, serverCss);
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
});

/**
 * GET /apply
 * Simulated target destination for "Proceed to Secure Application"
 */
app.get('/apply', (req, res) => {
  const params = sanitizeLoanInputs(
    req.query.amount,
    req.query.term,
    req.query.credit
  );
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Application Intake Demo</title>
      <link rel="stylesheet" href="/public/styles.css">
    </head>
    <body>
      <main class="app-container" style="text-align: center; background: white; padding: 3rem; border-radius: 16px; border: 1px solid #e2e8f0; margin-top: 2rem;">
        <h1 style="color: #0f172a; margin-bottom: 1rem;">Application Preview Confirmation</h1>
        <p style="color: #475569; font-size: 1.1rem; margin-bottom: 2rem;">
          You selected a loan amount of <strong>$${params.amount.toLocaleString()}</strong> over <strong>${params.term} Months</strong> with <strong>${params.credit.toUpperCase()}</strong> credit tier.
        </p>
        <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 2rem;">
          Notice: This application is an educational architecture demo. No actual financial application was initiated or submitted.
        </p>
        <a href="/" class="btn-proceed" style="max-width: 250px; margin: 0 auto;">&larr; Return to Calculator</a>
      </main>
    </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});



// Start server
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`[SSR Loan Calculator Server Running]`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`Declarative Shadow DOM: Active`);
  console.log(`Client Framework Hydration: Disabled (Native Upgrade Only)`);
  console.log(`======================================================\n`);
});

// At the bottom of src/server.js:
// let serverInstance = null;

// // Only start listening automatically if run directly, or export a ready promise
// if (process.env.NODE_ENV !== 'test') {
//   serverInstance = app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//   });
// } else {
//   // Bind to dynamic port 0 in test mode to avoid EADDRINUSE conflicts
//   serverInstance = app.listen(0);
// }

export { app, server };