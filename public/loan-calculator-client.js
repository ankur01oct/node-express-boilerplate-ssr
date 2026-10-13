/**
 * Client-Side Progressive Enhancement Custom Element
 * Demonstrates in-place enhancement without framework hydration.
 */

import {
    CREDIT_PROFILES,
    calculateLoanSchedule,
    formatCurrency,
    formatCurrencyExact,
    generateChartVectors
  } from './loan-model.js';
  
  class LoanCalculator extends HTMLElement {
    #shadow = null;
    #elements = null;
    #state = {
      amount: 16000,
      term: 60,
      credit: 'excellent'
    };
    #debounceTimer = null;
  
    connectedCallback() {
      // 1. Obtain Declarative Shadow Root natively created by the browser
      this.#shadow = this.shadowRoot;
  
      // Browser compatibility safety fallback for legacy browsers without DSD support:
      if (!this.#shadow) {
        const template = this.querySelector('template[shadowrootmode="open"]');
        if (template) {
          this.#shadow = this.attachShadow({ mode: 'open' });
          this.#shadow.appendChild(template.content.cloneNode(true));
          template.remove();
        } else {
          console.warn('LoanCalculator: ShadowRoot not found. Ensure DSD is supported or template exists.');
          return;
        }
      }
  
      // 2. Read initial state embedded from server attributes
      this.#state.amount = parseInt(this.dataset.amount || '16000', 10);
      this.#state.term = parseInt(this.dataset.term || '60', 10);
      this.#state.credit = this.dataset.credit || 'excellent';
  
      // 3. Cache required DOM node references from the existing Shadow Root
      this.#elements = {
        form: this.#shadow.getElementById('calculator-form'),
        amountSlider: this.#shadow.getElementById('amount-slider'),
        amountDisplay: this.#shadow.getElementById('val-amount-display'),
        monthlyDisplay: this.#shadow.getElementById('val-monthly'),
        interestDisplay: this.#shadow.getElementById('val-interest'),
        aprDisplay: this.#shadow.getElementById('val-apr'),
        pathPrincipal: this.#shadow.getElementById('path-principal'),
        pathInterest: this.#shadow.getElementById('path-interest'),
        srAnnouncer: this.#shadow.getElementById('sr-announcer'),
        btnProceed: this.#shadow.getElementById('btn-proceed')
      };
  
      // 4. Attach event listeners
      this.#bindEvents();
    }
  
    disconnectedCallback() {
      // Teardown event listeners to prevent memory leaks if disconnected
      if (this.#elements?.amountSlider) {
        this.#elements.amountSlider.removeEventListener('input', this.#onAmountInput);
      }
      if (this.#elements?.form) {
        this.#elements.form.removeEventListener('change', this.#onFormChange);
        this.#elements.form.removeEventListener('submit', this.#onFormSubmit);
      }
    }
  
    #bindEvents() {
      // High-frequency input event for slider
      this.#elements.amountSlider.addEventListener('input', this.#onAmountInput);
  
      // Change event bubbles from radio buttons (term and credit)
      this.#elements.form.addEventListener('change', this.#onFormChange);
  
      // Intercept form submit to route to application flow
      this.#elements.form.addEventListener('submit', this.#onFormSubmit);
    }
  
    #onAmountInput = (e) => {
      this.#state.amount = parseInt(e.target.value, 10);
      this.#updateCalculations(false);
    };
  
    #onFormChange = (e) => {
      if (e.target.name === 'term') {
        this.#state.term = parseInt(e.target.value, 10);
        this.#updateCalculations(true);
      } else if (e.target.name === 'credit') {
        this.#state.credit = e.target.value;
        this.#updateCalculations(true);
      }
    };
  
    #onFormSubmit = (e) => {
      e.preventDefault();
      const query = new URLSearchParams({
        amount: this.#state.amount,
        term: this.#state.term,
        credit: this.#state.credit
      }).toString();
      window.location.href = `/apply?${query}`;
    };
  
    /**
     * Recalculates metrics and updates targeted DOM properties in-place.
     */
    #updateCalculations(announceImmediately = false) {
      const { amount, term, credit } = this.#state;
      const profile = CREDIT_PROFILES[credit] || CREDIT_PROFILES.excellent;
      const { monthlyPayment, totalInterest, schedule } = calculateLoanSchedule(amount, term, profile.apr);
  
      // 1. Update text bubbles and values
      this.#elements.amountDisplay.textContent = formatCurrency(amount);
      this.#elements.monthlyDisplay.textContent = formatCurrencyExact(monthlyPayment);
      this.#elements.interestDisplay.textContent = formatCurrency(totalInterest);
      this.#elements.aprDisplay.textContent = profile.displayApr;
  
      // 2. Synchronize ARIA slider attributes
      this.#elements.amountSlider.setAttribute('aria-valuenow', amount);
      this.#elements.amountSlider.setAttribute('aria-valuetext', formatCurrency(amount));
  
      // 3. Update dataset attributes on host element
      this.dataset.amount = amount;
      this.dataset.term = term;
      this.dataset.credit = credit;
  
      // 4. Update SVG path vector definitions
      const chart = generateChartVectors(schedule, amount, term, totalInterest);
      this.#elements.pathPrincipal.setAttribute('d', chart.dPrincipal);
      this.#elements.pathInterest.setAttribute('d', chart.dInterest);
  
      // 5. Debounce live announcements for screen readers to avoid auditory spam
      clearTimeout(this.#debounceTimer);
      const delay = announceImmediately ? 0 : 400;
      this.#debounceTimer = setTimeout(() => {
        if (this.#elements.srAnnouncer) {
          this.#elements.srAnnouncer.textContent = 
            `Estimate updated: ${formatCurrency(amount)} over ${term} months. Monthly payment is ${formatCurrencyExact(monthlyPayment)}. Total interest is ${formatCurrency(totalInterest)}.`;
        }
      }, delay);
    }
  }
  
  // Register the custom element natively
  if (!customElements.get('loan-calculator')) {
    customElements.define('loan-calculator', LoanCalculator);
  }