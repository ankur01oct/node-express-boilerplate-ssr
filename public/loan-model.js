/**
 * Shared Amortization Math and Chart Generation Model
 * Isomorphic: Operates in both Node.js (Server) and Browser (Client).
 */

export const CREDIT_PROFILES = {
    excellent: { label: 'Excellent', apr: 0.0649, displayApr: '6.49%' },
    good: { label: 'Good', apr: 0.0999, displayApr: '9.99%' },
    fair: { label: 'Fair', apr: 0.1449, displayApr: '14.49%' }
  };
  
  export const LOAN_CONSTRAINTS = {
    minAmount: 1000,
    maxAmount: 50000,
    stepAmount: 500,
    defaultAmount: 16000,
    allowedTerms: [12, 24, 36, 48, 60],
    defaultTerm: 60,
    defaultCredit: 'excellent'
  };
  
  /**
   * Validates and normalizes loan input values.
   */
  export function sanitizeLoanInputs(rawAmount, rawTerm, rawCredit) {
    let amount = rawAmount !== undefined && rawAmount !== null && rawAmount !== ''
    ? parseInt(rawAmount, 10)
    : LOAN_CONSTRAINTS.defaultAmount;
    
    if (isNaN(amount) || amount < LOAN_CONSTRAINTS.minAmount) {
      amount = LOAN_CONSTRAINTS.minAmount;
    } else if (amount > LOAN_CONSTRAINTS.maxAmount) {
      amount = LOAN_CONSTRAINTS.maxAmount;
    }
    // Round to nearest step
    amount = Math.round(amount / LOAN_CONSTRAINTS.stepAmount) * LOAN_CONSTRAINTS.stepAmount;
  
    let term = parseInt(rawTerm, 10);
    if (!LOAN_CONSTRAINTS.allowedTerms.includes(term)) {
      term = LOAN_CONSTRAINTS.defaultTerm;
    }
  
    let credit = String(rawCredit || '').toLowerCase();
    if (!CREDIT_PROFILES[credit]) {
      credit = LOAN_CONSTRAINTS.defaultCredit;
    }
  
    return { amount, term, credit };
  }
  
  /**
   * Calculates complete fixed-rate amortization schedule and metrics.
   * 
   * Formula:
   * i = APR / 12
   * M = P * [ i(1 + i)^n ] / [ (1 + i)^n - 1 ]
   * For i = 0: M = P / n
   */
  export function calculateLoanSchedule(principal, termMonths, aprDecimal) {
    const n = termMonths;
    const P = principal;
    const i = aprDecimal / 12;
  
    let monthlyPayment = 0;
    if (aprDecimal === 0 || i === 0) {
      monthlyPayment = P / n;
    } else {
      const factor = Math.pow(1 + i, n);
      monthlyPayment = P * ((i * factor) / (factor - 1));
    }
  
    let remainingBalance = P;
    let cumulativePrincipal = 0;
    let cumulativeInterest = 0;
  
    const schedule = [
      {
        month: 0,
        payment: 0,
        principalPaid: 0,
        interestPaid: 0,
        cumulativePrincipal: 0,
        cumulativeInterest: 0,
        remainingBalance: P
      }
    ];
  
    for (let m = 1; m <= n; m++) {
      let interestPayment = remainingBalance * i;
      let principalPayment = monthlyPayment - interestPayment;
  
      // Boundary edge fix for final payment to prevent floating point residue
      if (m === n || remainingBalance - principalPayment < 0) {
        principalPayment = remainingBalance;
        monthlyPayment = principalPayment + interestPayment;
        remainingBalance = 0;
      } else {
        remainingBalance -= principalPayment;
      }
  
      cumulativePrincipal += principalPayment;
      cumulativeInterest += interestPayment;
  
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principalPaid: principalPayment,
        interestPaid: interestPayment,
        cumulativePrincipal: Math.min(P, cumulativePrincipal),
        cumulativeInterest: cumulativeInterest,
        remainingBalance: Math.max(0, remainingBalance)
      });
    }
  
    return {
      monthlyPayment,
      totalPaid: P + cumulativeInterest,
      totalInterest: cumulativeInterest,
      schedule
    };
  }
  
  /**
   * Currency formatter (USD)
   */
  export function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Math.round(num));
  }
  
  /**
   * Currency formatter with exact cents
   */
  export function formatCurrencyExact(num) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }
  
  /**
   * Mathematical projection for SVG Chart paths.
   * ViewBox: 0 0 700 280
   * Coordinates padded:
   * X: Left 65px -> Right 665px (Width 600px)
   * Y: Top 25px -> Bottom 235px (Height 210px)
   */
  export function generateChartVectors(schedule, principal, termMonths, totalInterest) {
    const width = 600;
    const height = 210;
    const originX = 65;
    const originY = 235; // Baseline y (0 value)
  
    // Max scale Y based on principal + margin to ensure curves don't clip
    const maxY = Math.max(principal, totalInterest, 1000) * 1.15;
  
    const pointsPrincipal = [];
    const pointsInterest = [];
  
    for (const row of schedule) {
      const x = originX + (row.month / termMonths) * width;
      const yPrincipal = originY - (row.cumulativePrincipal / maxY) * height;
      const yInterest = originY - (row.cumulativeInterest / maxY) * height;
  
      pointsPrincipal.push(`${x.toFixed(1)},${yPrincipal.toFixed(1)}`);
      pointsInterest.push(`${x.toFixed(1)},${yInterest.toFixed(1)}`);
    }
  
    const dPrincipal = `M ${pointsPrincipal.join(' L ')}`;
    const dInterest = `M ${pointsInterest.join(' L ')}`;
  
    // Vertical grid markers (Ticks for every $5,000 or scaled dynamically)
    const yTicks = [];
    const tickSteps = 4;
    for (let t = 0; t <= tickSteps; t++) {
      const val = (maxY / tickSteps) * t;
      const yPos = originY - (val / maxY) * height;
      yTicks.push({
        value: formatCurrency(val),
        y: yPos.toFixed(1)
      });
    }
  
    // Horizontal month intervals (0, 10, 20, 30, 40, 50, 60 or dynamic based on term)
    const xTicks = [];
    const monthInterval = termMonths <= 24 ? 6 : 10;
    for (let m = 0; m <= termMonths; m += monthInterval) {
      const xPos = originX + (m / termMonths) * width;
      xTicks.push({
        label: m === 0 ? 'Start' : `${m}m`,
        x: xPos.toFixed(1)
      });
    }
    // Ensure the terminal month is always labeled if not aligned on interval
    if (termMonths % monthInterval !== 0) {
      xTicks.push({
        label: `${termMonths}m`,
        x: (originX + width).toFixed(1)
      });
    }
  
    return {
      dPrincipal,
      dInterest,
      yTicks,
      xTicks,
      originX,
      originY,
      width,
      height,
      maxY
    };
  }