import {
    CREDIT_PROFILES,
    LOAN_CONSTRAINTS,
    calculateLoanSchedule,
    formatCurrency,
    formatCurrencyExact,
    generateChartVectors
  } from '../public/loan-model.js';
  
  /**
   * Generates the interior Declarative Shadow DOM markup for <loan-calculator>
   */
  export function renderLoanCalculatorShadowContent(params, cssText) {
    const { amount, term, credit } = params;
    const profile = CREDIT_PROFILES[credit];
    const { monthlyPayment, totalInterest, schedule } = calculateLoanSchedule(amount, term, profile.apr);
    const chart = generateChartVectors(schedule, amount, term, totalInterest);
  
    return `
      <style>
        ${cssText}
      </style>
  
      <div class="calculator-card" role="region" aria-labelledby="calc-heading">
        <!-- Dark Navy Chart Area -->
        <section class="chart-viewport" aria-labelledby="chart-title-id">
          <div class="chart-header">
            <h2 id="chart-title-id" class="chart-title">Recommended Loan Path</h2>
            <div class="chart-legend" aria-hidden="true">
              <div class="legend-item">
                <span class="legend-swatch-principal"></span>
                <span>Principal Paid</span>
              </div>
              <div class="legend-item">
                <span class="legend-swatch-interest"></span>
                <span>Interest Portion</span>
              </div>
            </div>
          </div>
  
          <div class="svg-chart-container">
            <svg viewBox="0 0 700 280" role="img" aria-label="Amortization graph showing cumulative principal paid and interest portion over ${term} months">
              <title>Loan Amortization Curves</title>
              <desc>Green solid line shows cumulative principal paid reaching ${formatCurrency(amount)}. Pink dashed line shows cumulative interest paid reaching ${formatCurrency(totalInterest)}.</desc>
  
              <!-- Horizontal Background Grid Lines -->
              ${chart.yTicks.map(t => `
                <line x1="${chart.originX}" y1="${t.y}" x2="${chart.originX + chart.width}" y2="${t.y}" class="grid-line" />
                <text x="${chart.originX - 10}" y="${Number(t.y) + 4}" text-anchor="end" class="axis-text">${t.value}</text>
              `).join('')}
  
              <!-- Horizontal Axis Timeline Labels -->
              ${chart.xTicks.map(t => `
                <text x="${t.x}" y="${chart.originY + 22}" text-anchor="middle" class="axis-text">${t.label}</text>
              `).join('')}
  
              <!-- Data Series Path Curves -->
              <path id="path-principal" class="path-principal" d="${chart.dPrincipal}" />
              <path id="path-interest" class="path-interest" d="${chart.dInterest}" />
            </svg>
          </div>
        </section>
  
        <!-- Three Summary Metrics -->
        <section class="metrics-summary-bar" aria-label="Key Loan Estimates">
          <div class="metric-cell">
            <div class="metric-label" id="lbl-monthly">Monthly Payment</div>
            <div class="metric-value" id="val-monthly" aria-labelledby="lbl-monthly">${formatCurrencyExact(monthlyPayment)}</div>
          </div>
          <div class="metric-cell">
            <div class="metric-label" id="lbl-interest">Total Interest</div>
            <div class="metric-value" id="val-interest" aria-labelledby="lbl-interest">${formatCurrency(totalInterest)}</div>
          </div>
          <div class="metric-cell">
            <div class="metric-label" id="lbl-apr">Recommended APR</div>
            <div class="metric-value highlight-green" id="val-apr" aria-labelledby="lbl-apr">${profile.displayApr}</div>
          </div>
        </section>
  
        <!-- Live Interactive Controls Wrapper Form -->
        <form id="calculator-form" class="calculator-controls" method="POST" action="/calculate">
          <!-- Live screen reader announcements -->
          <div id="sr-announcer" class="sr-only" aria-live="polite" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">
            Loan estimate updated: Monthly payment is ${formatCurrencyExact(monthlyPayment)}, Total interest is ${formatCurrency(totalInterest)}.
          </div>
  
          <!-- 1. Amount Slider -->
          <div class="control-group">
            <div class="control-header-row">
              <label for="amount-slider" class="control-label">Loan Amount</label>
              <span class="display-bubble" id="val-amount-display">${formatCurrency(amount)}</span>
            </div>
            <div class="range-slider-wrap">
              <input 
                type="range" 
                id="amount-slider" 
                name="amount" 
                class="range-slider"
                min="${LOAN_CONSTRAINTS.minAmount}" 
                max="${LOAN_CONSTRAINTS.maxAmount}" 
                step="${LOAN_CONSTRAINTS.stepAmount}" 
                value="${amount}"
                aria-valuemin="${LOAN_CONSTRAINTS.minAmount}"
                aria-valuemax="${LOAN_CONSTRAINTS.maxAmount}"
                aria-valuenow="${amount}"
                aria-valuetext="${formatCurrency(amount)}"
              />
            </div>
            <div class="range-scale-bounds" aria-hidden="true">
              <span>${formatCurrency(LOAN_CONSTRAINTS.minAmount)}</span>
              <span>${formatCurrency(LOAN_CONSTRAINTS.maxAmount)}</span>
            </div>
          </div>
  
          <!-- 2. Term Selector Pills -->
          <fieldset class="control-group" style="border: none;">
            <legend class="control-label" style="margin-bottom: 0.5rem;">Loan Term</legend>
            <div class="term-selector-grid" role="radiogroup">
              ${LOAN_CONSTRAINTS.allowedTerms.map(t => `
                <label class="term-pill-label">
                  <input 
                    type="radio" 
                    name="term" 
                    value="${t}" 
                    class="term-pill-input"
                    ${t === term ? 'checked' : ''} 
                  />
                  <span class="term-pill-box">${t} Months</span>
                </label>
              `).join('')}
            </div>
          </fieldset>
  
          <!-- 3. Credit Profile Segmented Control -->
          <fieldset class="control-group" style="border: none;">
            <legend class="control-label" style="margin-bottom: 0.5rem;">Estimated Credit Profile</legend>
            <div class="segmented-control" role="radiogroup">
              ${Object.entries(CREDIT_PROFILES).map(([key, val]) => `
                <label class="segment-label">
                  <input 
                    type="radio" 
                    name="credit" 
                    value="${key}" 
                    class="segment-input"
                    ${key === credit ? 'checked' : ''} 
                  />
                  <span class="segment-box">${val.label}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>
  
          <!-- 4. CTA Proceed Button -->
          <div class="cta-container">
            <button type="submit" id="btn-proceed" class="btn-proceed">
              Proceed to Secure Application &rarr;
            </button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Renders complete HTML Document containing Declarative Shadow DOM
   */
  export function renderFullHtmlDocument(loanParams, cssText) {
    const dsdContent = renderLoanCalculatorShadowContent(loanParams, cssText);
  
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loan Calculator Dashboard | Web Components SSR</title>
    <link rel="stylesheet" href="/public/styles.css">
  </head>
  <body>
    <main class="app-container">
      <header class="header-panel">
        <h1>Custom Loan Estimate</h1>
        <p>Configure your loan parameters below to preview your amortization pathway.</p>
      </header>
  
      <noscript>
        <div class="noscript-alert" role="status">
          <strong>Notice:</strong> JavaScript is disabled in your browser. The calculator initial values and SVG chart were fully pre-rendered on the server. Selecting options and clicking the submit button will recalculate your figures via server round-trip.
        </div>
      </noscript>
  
      <!-- Custom Element with Server-Side Declarative Shadow Root -->
      <loan-calculator
        data-amount="${loanParams.amount}"
        data-term="${loanParams.term}"
        data-credit="${loanParams.credit}"
      >
        <template shadowrootmode="open">
          ${dsdContent}
        </template>
      </loan-calculator>
  
      <footer class="legal-notice">
        * Illustrative APR estimates based on credit tier assumptions. All calculations assume fixed interest rates and equal monthly payments. Actual terms are subject to formal underwriting and verification.
      </footer>
    </main>
  
    <!-- Lightweight Client Enhancement Script (zero-framework hydration) -->
    <script type="module" src="/public/loan-calculator-client.js"></script>
  </body>
  </html>`;
  }