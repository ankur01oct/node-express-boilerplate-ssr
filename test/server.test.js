import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, server } from '../src/server.js';
import { formatCurrency } from '../public/loan-model.js';

describe('Server SSR and Declarative Shadow DOM Tests', () => {
  let baseUrl = '';

  before(() => {
    const addr = server.address();
    const port = typeof addr === 'string' ? addr : addr.port;
    baseUrl = `http://localhost:${port}`;
  });

  after(() => {
    server.close();
  });

  it('GET / responds with 200 OK and contains Declarative Shadow DOM markup', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);

    const body = await res.text();

    // 1. Host element presence
    assert.ok(body.includes('<loan-calculator'), 'Response must contain <loan-calculator>');
    
    // 2. Declarative Shadow DOM template presence
    assert.ok(
      body.includes('<template shadowrootmode="open">'),
      'Response must contain <template shadowrootmode="open">'
    );

    // 3. Core interactive UI anchors
    assert.ok(body.includes('Recommended Loan Path'), 'Must contain chart heading');
    assert.ok(body.includes('id="val-monthly"'), 'Must contain monthly value container');
    assert.ok(body.includes('id="val-amount-display"'), 'Must contain amount display element');
    assert.ok(body.includes('id="amount-slider"'), 'Must contain the range slider');

    // 4. Default amount verification (flexible check for attribute or slider value)
    const hasAmountAttr = body.includes('data-amount="16000"');
    const hasSliderVal = body.includes('value="16000"');
    assert.ok(
      hasAmountAttr || hasSliderVal,
      'Response must reflect the default amount 16000 either on data-amount or slider value'
    );
  });

  it('POST /calculate performs progressive enhancement SSR recalculation', async () => {
    const formData = new URLSearchParams();
    formData.append('amount', '25000');
    formData.append('term', '36');
    formData.append('credit', 'good');

    const res = await fetch(`${baseUrl}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    assert.equal(res.status, 200);
    const body = await res.text();

    // 1. Declarative Shadow DOM check on recalculation
    assert.ok(
      body.includes('<template shadowrootmode="open">'),
      'Recalculated page must contain <template shadowrootmode="open">'
    );

    // 2. Form values reflected in response
    const hasAmountAttr = body.includes('data-amount="25000"');
    const hasSliderVal = body.includes('value="25000"');
    assert.ok(
      hasAmountAttr || hasSliderVal,
      'Response must reflect the recalculated amount 25000'
    );

    // 3. Selected APR for "good" credit tier (9.99%)
    assert.ok(body.includes('9.99%'), 'Response must reflect 9.99% APR for good credit');

    // 4. Formatted display check
    const expectedFormatted = formatCurrency(25000);
    assert.ok(
      body.includes(expectedFormatted) || body.includes('25,000') || body.includes('25000'),
      `Response should include 25000 formatted or as raw value`
    );
  });
});