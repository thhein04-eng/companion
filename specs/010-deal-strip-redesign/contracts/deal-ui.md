# Contract: Deal UI (`shared-ui/src/lib/deal/`, `shared-data-access`)

Types come from [data-model.md](../data-model.md). Visual treatments come from
[design-system.md](./design-system.md).

## shared-data-access

```ts
// deal-edits-provider.tsx — mounted inside ScenariosProvider in the root layout
function DealEditsProvider(props: { children: ReactNode }): JSX.Element;
function useDealEdits(): {
  editDeal(field: DealFieldKey, value: unknown, source: ChangeRecord['source']): void;
  endGesture(): void;                  // closes a scrub gesture (pointer-up / key-up)
  lastChange: ChangeRecord | null;
  changeSeq: number;
  undo(): void;                        // no-op when lastChange is null
  dismiss(): void;
};

// use-setup-mode.ts
function useSetupMode(): {
  needsSetup: boolean;                 // for the active scenario (data-model §E)
  canFinish: boolean;
  finish(): void;                      // Done
  skip(): void;                        // Escape / close / backdrop
};

// use-rental-editor.ts — moved from deal-analyzer-ui, same signature
function useRentalEditor(): { updateActiveRental(patch: Partial<RentalAssumptions> | null): void };
```

`editDeal` is the only write path used by the deal UI. It calls `updateActiveScenario` (which
still runs `applyScenarioPatch`, so derived principal rules are unchanged) or `updateActiveRental`.

## shared-ui/src/lib/deal

```ts
interface DealStripProps {
  profile: PageProfile;
  headline: Headline;
  /** Validation for the active scenario, from the view's existing memo (data-model §G). */
  errors: FieldError[];
  /** P&I and total from the view's schedule; null while invalid. */
  payment: { principalAndInterest: number; total: number; parts: PaymentPart[] } | null;
}
function DealStrip(props: DealStripProps): JSX.Element;
```

**Renders**: `<section aria-label="Deal">`, sticky at `top: 0` on desktop and at the mobile
header's height below `lg`, `z-20`. It contains:

**Chip order** follows data-model §C: pinned first (including `total` when it is pinned), then
the rest, then muted, then `total` if it isn't pinned. If the strip would grow past `33vh`, the
chips row becomes a single horizontally scrolling line.

1. **The top row**: scenario `Tabs`, a spacer, an error count `Button` when
   `errors.length > 0` (text: `"{n} input(s) need fixing"`, `tone: bad`), and the primary
   **Edit deal** `Button`.
2. **The chips row**: chips ordered `pinned → others → muted` (data-model §C), then missing-input
   chips for each `profile.requires` whose field is null. A chip whose field has an error renders
   with `tone='err'` and a visible "missing" or "invalid" word (color is not the only signal).

A chip opens `ChipPopover` (ui-sdk Popover), which contains a `NumberField` with `scrub`, the field's
error, and the headline line `"{label} {format(atOpen)} → {format(current)}"`, or `naReason`. When
the popover is near the viewport edge, ui-sdk positioning flips it.

```ts
interface DealSheetProps {
  open: boolean;
  mode: 'edit' | 'setup';
  focusField?: DealFieldKey;          // scroll to it and focus it on open
  onOpenChange(open: boolean, reason: 'done' | 'dismiss'): void;
  headline: Headline;
  payment: DealStripProps['payment'];
  errors: FieldError[];
}
function DealSheet(props: DealSheetProps): JSX.Element;
```

- **Side**: right at `lg` and up (≥1024px), bottom below it (`sheetPhysics`).
- **Header**: edit mode shows "{scenario name} · deal" with a **Done** button. Setup mode shows
  "Welcome, set up this deal" with a one-line hint, plus **Done** (disabled until `canFinish`) and
  **Skip for now**.
- **Body**: `DealSentence`, then the groups `Property` · `Loan` · `Monthly costs` · `Rental`, each
  with an `Eyebrow` and a 2-column `Field` grid. Loan amount is a read-only derived row ("Loan
  amount — $360,000 · from price and down payment") unless it is overridden or there is no price.
  Monthly costs shows `PaymentBar`, then the P&I and total rows, then the PMI-drop note (copy
  unchanged from today).
- **Focus**: closing returns focus to the opener, except Done in setup mode, which focuses
  `#main-content h1`.

```ts
function DealSentence(props: { scenario: LoanScenario }): JSX.Element;
// Inline <button class="tok"> per input value. Activating it swaps in an inline Field (Enter / blur commits, Escape cancels).
// Derived values render as <b> with aria-description "Calculated from home price and down payment".

function PaymentBar(props: { parts: PaymentPart[]; total: number; onActivate(field: DealFieldKey): void }): JSX.Element;
// Wraps @companion/charts SegmentedBar with onSegmentActivate. The legend lists $0 parts ("PMI $0 at 20% down").
interface PaymentPart { field: DealFieldKey | 'principalAndInterest'; label: string; monthly: number }

// Drag-to-adjust (US5) is a prop on the existing NumberField, built on ui-sdk NumberInputScrubArea (research R2):
//   <NumberField … scrub={{ field: DealFieldKey, onDelta?: (delta: number) => void }} />
// It uses pixelsPerStep 8, step from DEAL_FIELD_STEPS, ×10 on Shift, and min/max from data-model §A.
// Every change goes to editDeal(field, v, 'scrub'), and the end of a scrub calls endGesture().

function Ripple(props: { value: number | null; children: ReactNode }): JSX.Element;
function DealChangeToast(): JSX.Element;   // rendered once in AppShell's ToastRegion
function FixInputsButton(props: { errors: FieldError[] }): JSX.Element;
// Replaces every "Fix the highlighted fields above" message (FR-024).
```

## Page views (each of the 5)

```tsx
<PageHeader eyebrow="Analysis" title="DSCR & Financing" lede="…" />
<DealStrip profile={FINANCING_PROFILE} headline={headline} errors={dealErrors} payment={payment} />
{/* page-only inputs and results, each section wrapped in SectionHeader, no shared input sections */}
```

`ScenarioTabs`, `LoanInputForm`, `CostBreakdownPanel` and `RentalInputsPanel` no longer render
directly in any view. The sheet is their only host. The headline figure(s) and KPIs in each view
are wrapped in `<Ripple>`.

## ui-sdk props used

Verified against `@ui-sdk/react` / `@ui-sdk/core` 0.1.0-beta.1 (T004).

- **Theme (T003)**: `createColorScheme({ global: true, storage: createLocalStorage('companion.colorScheme') })`
  from `@ui-sdk/core`. **No storage is used unless one is passed.** `createLocalStorage` writes
  `localStorage` and falls back to memory when storage can't be written (it checks with a probe).
  `<Preferences preferences={[colorScheme]}>` from `@ui-sdk/react/preferences` writes
  `data-color-scheme="system|light|dark"` on `<html>` before hydration. `colorScheme.set(value)`
  changes it, and `usePreference(colorScheme)` returns `{ value, system, resolved }`.
- **Popover**: `<Popover open? onOpenChange?(open, details) modal?>`, then
  `<PopoverTrigger render?>`, then `<PopoverContent side align sideOffset collisionPadding initialFocus finalFocus>`.
  Plus `PopoverTitle`, `PopoverDescription` and `PopoverClose`.
- **Drawer**: `<Drawer side="left|right|bottom|top" open onOpenChange?(open, details)
  onOpenChangeComplete closeOnOutsidePress modal preventEdgeSwipe>`, then `DrawerBackdrop`,
  `DrawerContent`, `DrawerTitle`, `DrawerDescription`, `DrawerClose`, `DrawerHandle` and
  `DrawerTrigger`. Bottom sheets use the default `sheetPhysics.ios`, so `physics` is optional.
- **Toast**: `<ToastRegion side="bottom" align="center" maxVisible aria-label>{(t) => <Toast>…}</ToastRegion>`,
  with the parts `Toast`, `ToastTitle`, `ToastDescription`, `ToastAction` and `ToastClose`.
  `toast({ id, title, description, duration, priority: 'polite', action: { label, onAction },
  onDismiss })` returns the id. Calling it again with the same `id` updates the toast in place
  (used for coalescing). `toast.dismiss(id)`.
- **NumberInput**: options `value`, `onValueChange(value, { reason })`, `onValueCommit`, `min`,
  `max`, `step`, `largeStep` (Shift), `smallStep`, `format` and `locale`. `reason` includes `'scrub'`.
  Parts: `NumberInputGroup`, `NumberInputControl`, `NumberInputIncrement` / `Decrement`,
  `NumberInputScrubArea({ orientation, pixelsPerStep })` and `NumberInputScrubAreaCursor`.
