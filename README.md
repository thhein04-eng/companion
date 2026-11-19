# Companion: real-estate calculators

A Next.js app (`apps/amortization-calculator`) with five analysis pages behind a responsive, collapsible left-side menu:

| Route            | Page                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `/amortization`  | Amortization Calculator: payment, full schedule, extra payments, CSV export                    |
| `/deal-analyzer` | Rental Deal Analyzer: cash flow, NOI, cap rate, cash-on-cash, 1% and 50% rules                 |
| `/financing`     | DSCR & Financing: debt coverage and conventional / ARM / DSCR loan comparison                  |
| `/wealth`        | Wealth Projection: equity, cash flow and net worth over 1–30 years                             |
| `/pro-forma`     | Hold & Exit Pro Forma: sale, IRR, profit and equity multiple                                   |

`/` redirects to `/amortization`. Every page shares one session-scoped set of scenarios. The shared
deal inputs (property, loan, monthly costs, rent) are edited from the **Deal Strip** at the top of
each page and its **Edit deal** sheet (spec 010). Each page keeps only its own inputs inline.

## Design system

The look follows [`specs/010-deal-strip-redesign/design-reference.html`](specs/010-deal-strip-redesign/design-reference.html).

- **Tokens**: [`libs/shared/ui/src/styles/tokens.css`](libs/shared/ui/src/styles/tokens.css)
  holds every color (light and dark), the type scale, the radii and the spacing, exposed as
  Tailwind utilities (`bg-surface`, `text-muted`, `border-line`, `rounded-xl`, …). The rules are in
  [contracts/design-system.md](specs/010-deal-strip-redesign/contracts/design-system.md).
- **No raw palette classes**: ESLint rejects `neutral-*`, `red-*` and the like in UI code. It also
  rejects `text-faint`, since `faint` is for decoration only (contrast rule FR-035).
- **Components**: `libs/shared/ui/src/lib/ds/` holds the styled layer (Button, Chip, Card, Kpi,
  Sheet, Popover, Toast, …) on the headless `@ui-sdk/react` behaviors.
- **Theme**: System / Light / Dark switcher in the nav (`ThemeSwitcher`). The choice is kept in
  `localStorage['companion.colorScheme']` and applied before first paint.
- **Fonts**: Space Grotesk (display), Inter (body), JetBrains Mono (data), self-hosted with
  `next/font`.

## Library layout

Code is split by feature, with shared code in one place (spec 003):

```text
libs/shared/calculations        shared-calculations         loan model + math (pure)
libs/shared/data-access         shared-data-access          the scenario store
libs/shared/ui                  shared-ui                   fields, forms, comparison grid, app shell
libs/amortization/calculations  amortization-calculations   amortization-only math
libs/amortization/ui            amortization-ui             /amortization page
libs/deal-analyzer/calculations deal-analyzer-calculations  rental analysis (pure)
libs/deal-analyzer/ui           deal-analyzer-ui            /deal-analyzer page
```

The two features never import each other, and shared code never imports a feature. `@nx/enforce-module-boundaries` enforces this using the tags described in [module-boundaries.md](specs/003-feature-pages-navigation/contracts/module-boundaries.md). Each library's README lists its public API.

```sh
npm exec nx -- dev amortization-calculator     # run the app
npm exec nx -- run-many -t lint,typecheck,test # static checks + unit tests
npm exec nx -- e2e amortization-calculator-e2e # Playwright
```

---

# Nx workspace reference

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/docs/technologies/typescript/introduction?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

🚀 If you haven't connected to Nx Cloud yet, [complete your setup here](https://cloud.nx.app/get-started). Get faster builds with remote caching, distributed task execution, and self-healing CI. [See how your workspace can benefit](#nx-cloud).

## Generate a library

```sh
npx nx g @nx/js:lib packages/pkg1 --publishable --importPath=@my-org/pkg1
```

## Run tasks

To build the library use:

```sh
npx nx run pkg1:build
```

To run any task with Nx use:

```sh
npx nx run <project-name>:<target>
```

These targets are either [inferred automatically](https://nx.dev/docs/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/docs/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Versioning and releasing

To version and release the library use

```
npx nx release
```

Pass `--dry-run` to see what would happen without actually releasing the library.

[Learn more about Nx release &raquo;](https://nx.dev/docs/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Keep TypeScript project references up to date

Nx automatically updates TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) in `tsconfig.json` files to ensure they remain accurate based on your project dependencies (`import` or `require` statements). This sync is automatically done when running tasks such as `build` or `typecheck`, which require updated references to function correctly.

To manually trigger the process to sync the project graph dependencies information to the TypeScript project references, run the following command:

```sh
npx nx sync
```

You can enforce that the TypeScript project references are always in the correct state when running in CI by adding a step to your CI job configuration that runs the following command:

```sh
npx nx sync:check
```

[Learn more about nx sync](https://nx.dev/reference/nx-commands#sync)

## Nx Cloud

Nx Cloud ensures a [fast and scalable CI](https://nx.dev/nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/docs/features/ci-features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/docs/features/ci-features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/docs/features/ci-features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/docs/features/ci-features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Set up CI (non-Github Actions CI)

**Note:** This is only required if your CI provider is not GitHub Actions.

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/docs/features/ci-features?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/docs/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## 🔗 Learn More

- [Nx Documentation](https://nx.dev/docs)
- [Crafting Your Workspace Tutorial](https://nx.dev/docs/getting-started/tutorials/crafting-your-workspace)
- [Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries)
- [Releasing Packages](https://nx.dev/docs/features/manage-releases)
- [Nx Plugins](https://nx.dev/docs/concepts/nx-plugins)
- [Nx Cloud](https://nx.dev/nx-cloud)

## 💬 Community

Join the Nx community:

- [Discord](https://go.nx.dev/community)
- [X (Twitter)](https://twitter.com/nxdevtools)
- [LinkedIn](https://www.linkedin.com/company/nrwl)
- [YouTube](https://www.youtube.com/@nxdevtools)
- [Blog](https://nx.dev/blog)
