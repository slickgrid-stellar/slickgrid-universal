# Slickgrid-Universal

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![CircleCI](https://circleci.com/gh/ghiscoding/slickgrid-universal/tree/master.svg?style=shield)](https://circleci.com/gh/ghiscoding/workflows/slickgrid-universal/tree/master)
[![codecov](https://codecov.io/gh/ghiscoding/slickgrid-universal/branch/master/graph/badge.svg)](https://codecov.io/gh/ghiscoding/slickgrid-universal)
[![jest](https://jestjs.io/img/jest-badge.svg)](https://github.com/facebook/jest)
<!-- [![npm version](https://badge.fury.io/js/slickgrid-universal.svg)](//npmjs.com/package/slickgrid-universal)
[![NPM downloads](https://img.shields.io/npm/dy/slickgrid-universal.svg)](https://npmjs.org/package/slickgrid-universal) -->

This is a monorepo project (using Lerna) which is regrouping a few packages under a single repository. The goal is to create a common repo that includes all Editors, Filters, Extensions and Services that could be used by any Framework (it is framework agnostic). It's also a good opportunity to decouple some other features/services that not every user require, this will also help in getting a smaller bundle size. For example, not many users require backend services (OData, GraphQL), which is why they are better handled in a monorepo structure.

### Why create this monorepo?
You might be wondering why was this monorepo created?
1. it removes lot of duplicate code that existed in both [Angular-Slickgrid](https://github.com/ghiscoding/Angular-Slickgrid) and [Aurelia-Slickgrid](https://github.com/ghiscoding/aurelia-slickgrid) (over 80% were the same code and that is not very DRY).
2. removes any Services that not all user need/want (OData, GraphQL, Export to File, Export to Excel, ...)
3. framework agnostic, it can be implemented in many more frameworks in the future

### Framework using this monorepo
This is a Work in Progress, eventually [Angular-Slickgrid](https://github.com/ghiscoding/Angular-Slickgrid) and [Aurelia-Slickgrid](https://github.com/ghiscoding/aurelia-slickgrid) will be rewritten to use this monorepo which will simplify debugging/fixing common code. 

However, this project is built with a Vanilla Implementation (no associated to any framework) and that is what the UI will be tested with. The Vanilla bundle is also used in our SalesForce (with Lighning Web Component) hence the creation of this monorepo.

The main packages structure is the following
- `@slickgrid-universal/common`: commonly used Formatters/Editors/Filters/Services/...
  - this can then be used by any Framework (Angular, Aurelia, Vanilla, ...)
- `@slickgrid-universal/vanilla-bundle`: a vanilla JS implementation (no framework)
- `slickgrid-universal/vanilla-bundle-examples` standalone package for demo purposes and UI testing (not a public package)

### Installation
To get going with this monorepo, you will need to clone the repo and then follow the steps below

1. Lerna Bootstrap
Run it **only once**, this will install all dependencies and add necessary monorepo symlinks
```bash
npm run bootstrap
```

2. Build
To get started you must also run (also once) an initial build so that all necessary `dist` are created for all the packages to work together.
```bash
npm run build
```

3. Run Dev (Vanilla Implementation)
There is a Vanilla flavor implementation of this monorepo, vanilla means that it is not associated to any framework and so it is plain TypeScript without being bound to any framework. The implementation is very similar to Angular and Aurelia, it could be used as a guideline to implement it in other frameworks.

```bash
npm run dev:watch
```

### Tests

##### Unit Tests
To run all packages Jest unit tests, you can run this command
```bash
npm run test

# or as a watch
npm run test:watch
```

## TODO
#### Code
- [x] Aggregators (6)
- [ ] Editors
  - [x] Autocomplete
  - [x] Checkbox
  - [ ] Date
  - [x] Float
  - [x] Integer
  - [x] Long Text
  - [x] Multiple Select
  - [x] Single Select
  - [x] Slider
  - [x] Text
- [ ] Filters
  - [x] Autocomplete
  - [ ] Compound Date
  - [x] Compound Input(s)
  - [x] Compound Slider
  - [ ] Date Range
  - [x] Input(s)
  - [x] Multiple Select 
  - [x] Single Select 
  - [x] Native Select 
  - [x] Slider
  - [x] Slider Range
- [x] Formatters (31)
- [ ] Extensions
  - [x] AutoTooltip
  - [x] Cell External Copy Manager
  - [x] Cell Menu
  - [x] Checkbox Selector
  - [x] Context Menu
  - [x] Draggable Grouping
  - [x] Grid Menu
  - [x] Header Button
  - [x] Header Menu
  - [ ] Row Detail
  - [x] Row Move
    - [ ] the Column itself should be created by the extension instead of the user itself
    - [ ] column index position (requires SlickGrid [PR #474](https://github.com/6pac/SlickGrid/pull/474))
  - [x] Row Selection
- [x] Grouping Formatters (12)
- [x] Sorters (5)
- [ ] Services
  - [x] Collection
  - [ ] Excel Export (**separate package**)
  - [ ] Export Text (**separate package**)
  - [x] Extension
  - [x] Filter
  - [ ] GraphQL (**separate package**)
  - [ ] OData (**separate package**)
  - [x] Grid Event
  - [x] Grid Service (helper)
  - [ ] Grid State
  - [x] Grouping & Col Span
  - [ ] Pagination
  - [ ] Resizer
  - [x] Shared
  - [x] Sort

#### Other Todos
- [x] VScode Chrome Debugger
- [x] Jest Debugger
- [ ] Add Multiple Example Demos with Vanilla implementation
  - [ ] Add GitHub Demo website
- [x] Add CI/CD (CircleCI or GitHub Actions)
  - [x] Add Jest Unit tests
  - [ ] Add Cypress E2E tests
  - [x] Add Code Coverage (codecov)
  - [x] Build and run on every PR
- [ ] Remove any Deprecated code
  - [ ] Create a Migration Guide 
- [ ] Use latest version of SlickGrid and remove measureScrollbar compensation
