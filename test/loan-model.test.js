import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDIT_PROFILES,
  LOAN_CONSTRAINTS,
  sanitizeLoanInputs,
  calculateLoanSchedule,
  generateChartVectors,
  formatCurrency,
  formatCurrencyExact
} from '../public/loan-model.js';

describe('Loan Model - Domain Unit Tests', () => {

  it('calculates zero-interest loans correctly without division by zero', () => {
    const principal = 12000;
    const term = 12;
    const apr = 0.0;
    const result = calculateLoanSchedule(principal, term, apr);

    assert.equal(result.monthlyPayment, 1000);
    assert.equal(result.totalInterest, 0);
    assert.equal(result.totalPaid, 12000);
    assert.equal(result.schedule.length, 13); // month 0 to 12
    assert.equal(result.schedule[12].remainingBalance, 0);
    assert.equal(result.schedule[12].cumulativePrincipal, 12000);
  });

  it('calculates positive-interest amortization matching financial standards', () => {
    // $16,000 at 6.49% for 60 months
    const principal = 16000;
    const term = 60;
    const apr = 0.0649;
    const result = calculateLoanSchedule(principal, term, apr);

    // Standard financial verification: M ~ $313.06
    assert.ok(result.monthlyPayment > 312.50 && result.monthlyPayment < 313.50);
    assert.ok(result.totalInterest > 2750 && result.totalInterest < 2850);
    assert.equal(result.schedule.length, 61);

    const finalRow = result.schedule[60];
    assert.equal(finalRow.remainingBalance, 0);
    assert.equal(Math.round(finalRow.cumulativePrincipal), 16000);
    assert.equal(Math.round(finalRow.cumulativeInterest), Math.round(result.totalInterest));
  });

  it('clamps invalid loan amounts and terms within safe boundaries', () => {
    // Under minimum
    const under = sanitizeLoanInputs(200, 60, 'excellent');
    assert.equal(under.amount, LOAN_CONSTRAINTS.minAmount);

    // Over maximum
    const over = sanitizeLoanInputs(999999, 60, 'excellent');
    assert.equal(over.amount, LOAN_CONSTRAINTS.maxAmount);

    // Invalid term defaults to 60
    const badTerm = sanitizeLoanInputs(16000, 99, 'excellent');
    assert.equal(badTerm.term, LOAN_CONSTRAINTS.defaultTerm);

    // Invalid credit tier defaults to excellent
    const badCredit = sanitizeLoanInputs(16000, 60, 'unknown_tier');
    assert.equal(badCredit.credit, 'excellent');
  });

  it('generates valid SVG path strings and grid markers', () => {
    const principal = 16000;
    const term = 60;
    const apr = 0.0649;
    const { schedule, totalInterest } = calculateLoanSchedule(principal, term, apr);
    const vectors = generateChartVectors(schedule, principal, term, totalInterest);

    assert.ok(vectors.dPrincipal.startsWith('M '));
    assert.ok(vectors.dInterest.startsWith('M '));
    assert.ok(vectors.yTicks.length > 0);
    assert.ok(vectors.xTicks.length > 0);
    assert.equal(vectors.xTicks[0].label, 'Start');
  });

  it('formats currency strings properly', () => {
    assert.equal(formatCurrency(16000), '$16,000');
    assert.equal(formatCurrencyExact(313.06), '$313.06');
  });
});