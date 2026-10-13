# Server-Side Rendered Loan Calculator with Declarative Shadow DOM

This project demonstrates how to build a high-performance web application using **Node.js + Express** and native **Web Components** utilizing **Declarative Shadow DOM (DSD)**.

## Core Architectural Highlight: Zero-Framework Hydration
Unlike React, Next.js, or Vue, which transmit an HTML shell and reconstruct a client-side Virtual DOM tree to bind listeners (hydration), this application:
1. Emits pre-computed, fully-rendered HTML with encapsulated styles and SVG curves via `<template shadowrootmode="open">`.
2. Allows modern browser rendering engines to construct the live ShadowRoot during stream parsing.
3. Enhances the pre-existing DOM in-place using standard Web Component lifecycles (`connectedCallback`).
4. Avoids DOM teardown or component tree reconstruction.

## Requirements
- Node.js >= 20.0.0
- npm >= 9.0.0

## Quick Start
```bash
npm install
npm start