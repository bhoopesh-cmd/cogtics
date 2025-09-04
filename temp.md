Prompt 1- 🔧 RLDA – UI Corrections & Consistency Pass (Origin UI + shadcn)

Role: You are refactoring the RLDA frontend to match Origin UI + shadcn design language.
Constraints: Next.js (App Router), Tailwind, shadcn/ui, lucide-react. Use HSL CSS variables. Do not change API contracts. Prefer composition via Card wrappers. Keep dark mode class-based.
What to do: Apply the changes below, in order. When asked to create a new file, create it with the given content. If a file already exists, update it in place.

0) Tailwind + Theme Foundation
0.1 Update tailwind.config.ts

Ensure class-based dark mode, container, HSL tokens, and plugins.

// tailwind.config.ts
import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      boxShadow: {
        card: "0 1px 0 0 hsl(var(--border)/.6), 0 1px 2px 0 hsl(var(--foreground)/.04)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
} satisfies Config;

export default config;

0.2 Normalize tokens in app/globals.css

Use HSL variables; add icon normalization, prose, easing curves; remove hard-coded icon fills.

/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ---- Tokens (adjust if you have Origin’s set) ---- */
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;

  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;

  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 215 20% 65%;

  --primary: 222 47% 11%;
  --primary-foreground: 210 40% 98%;

  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;

  --accent: 210 40% 96%;
  --accent-foreground: 222 47% 11%;

  --destructive: 0 84% 60%;
  --destructive-foreground: 210 40% 98%;
}

.dark {
  --background: 222 47% 5%;
  --foreground: 210 40% 98%;

  --muted: 217 33% 17%;
  --muted-foreground: 217 10% 65%;

  --card: 222 47% 7%;
  --card-foreground: 210 40% 98%;

  --popover: 222 47% 7%;
  --popover-foreground: 210 40% 98%;

  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 217 20% 65%;

  --primary: 210 40% 98%;
  --primary-foreground: 222 47% 11%;

  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;

  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;

  --destructive: 0 63% 31%;
  --destructive-foreground: 0 0% 98%;
}

/* ---- Global base ---- */
@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground antialiased; }
}

/* ---- Prose for markdown ---- */
.prose { @apply max-w-none; }

/* ---- Icon normalization (outline icons) ---- */
svg.icon, .icon svg {
  width: 1rem; height: 1rem;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---- Easing utilities ---- */
@layer utilities {
  .ease-in-sine { transition-timing-function: cubic-bezier(0.12,0,0.39,0); }
  .ease-out-sine { transition-timing-function: cubic-bezier(0.61,1,0.88,1); }
  .ease-in-out-sine { transition-timing-function: cubic-bezier(0.37,0,0.63,1); }
  .ease-in-quad { transition-timing-function: cubic-bezier(0.11,0,0.5,0); }
  .ease-out-quad { transition-timing-function: cubic-bezier(0.5,1,0.89,1); }
  .ease-in-out-quad { transition-timing-function: cubic-bezier(0.45,0,0.55,1); }
  .ease-in-cubic { transition-timing-function: cubic-bezier(0.32,0,0.67,0); }
  .ease-out-cubic { transition-timing-function: cubic-bezier(0.33,1,0.68,1); }
  .ease-in-out-cubic { transition-timing-function: cubic-bezier(0.65,0,0.35,1); }
  .ease-in-quart { transition-timing-function: cubic-bezier(0.5,0,0.75,0); }
  .ease-out-quart { transition-timing-function: cubic-bezier(0.25,1,0.5,1); }
  .ease-in-out-quart { transition-timing-function: cubic-bezier(0.76,0,0.24,1); }
  .ease-spring-soft { transition-timing-function: cubic-bezier(0.16,1,0.3,1); }
}

0.3 Icons → use lucide-react

Replace any raw SVGs with Lucide components and remove hard-coded fills.

import { LayoutDashboard, FileText, Receipt, Users, Plug, BarChart3, Settings } from "lucide-react";
// usage
<LayoutDashboard className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden />

1) Density, Spacing, and Radii

Apply rounded-2xl to cards and major surfaces.

Add subtle lift on hover for cards/lists:

<Card className="rounded-2xl border shadow-card transition-all duration-300 ease-out-quart hover:-translate-y-0.5 hover:shadow-md">
  ...
</Card>


Use compact table rows and consistent paddings:

<Table>
  {/* add className on the wrapper */}
</Table>

/* optional compact density tweak */
.table-compact th, .table-compact td { padding-top: .5rem; padding-bottom: .5rem; }

2) Card Wrappers for Tables & Charts

Create a consistent wrapper pattern:

// components/wrappers.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function TableCard({
  title, description, toolbar, children,
}: { title: string; description?: string; toolbar?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border transition-all duration-300 ease-out-quart">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {toolbar}
        </div>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border transition-all duration-300 ease-out-quart hover:shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

3) Table Toolbar (MVP pattern)

Create a lean toolbar (search + filter + export). We’ll place it in CardHeader.

// components/table-toolbar.tsx
"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";

export function TableToolbar({
  onSearch, rightActions,
}: { onSearch?: (q: string) => void; rightActions?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search…"
        className="h-9 w-[220px]"
        onChange={(e) => onSearch?.(e.target.value)}
      />
      <Button variant="outline" size="sm" className="h-9">
        <Filter className="mr-2 h-4 w-4" /> Filters
      </Button>
      <div className="ml-auto flex items-center gap-2">
        {rightActions}
        <Button variant="outline" size="sm" className="h-9">
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>
    </div>
  );
}


Usage with wrapper:

<TableCard
  title="Leakage Findings"
  description="Detected discrepancies and risks"
  toolbar={<TableToolbar />}
/>

4) Toasts, Alerts, Skeletons

Ensure sonner Toaster is mounted once (e.g., in app/layout.tsx).

// app/layout.tsx (inside <body>)
{/* <Toaster position="top-right" /> */}


Use Alert for inline form status (info/destructive), and Skeleton rows while loading KPIs/table content.

5) Markdown Rendering (Chat)

Install:

npm i react-markdown remark-gfm rehype-highlight


Create:

// components/markdown-renderer.tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

6) Accessibilty & States

Add aria-current="page" on active nav items.

Visible focus rings:

/* app/globals.css add-on */
:where(a,button,[role="button"],input,select,textarea):focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px hsl(var(--ring)/.35);
}


For destructive actions, use variant="destructive" and confirm dialogs.

7) Replace raw SVGs and color offsets

Find any <svg> with hardcoded fill/stroke hex and replace with stroke="currentColor" and Tailwind text-* classes.

Prefer lucide-react imports over inline SVGs to inherit theme automatically.

8) Easing & Motion polish

Apply transition-all duration-300 ease-out-quart on Cards, table rows (hover:bg-muted/60), buttons (hover:shadow-sm).

For long running actions, show cursor-progress + disabled buttons and a loading toast.

9) Quick Fix Checklist (run these now)

 Update tailwind.config.ts exactly as above.

 Replace tokens + utilities in app/globals.css.

 Replace raw SVG icons with lucide-react imports.

 Wrap tables/charts in TableCard/ChartCard.

 Add TableToolbar and slot into CardHeader.

 Mount <Toaster />, use Alert/Skeleton where appropriate.

 Add MarkdownRenderer and use it in chat message bubbles.

 Verify focus rings & aria attributes.

 Ensure rounded-2xl and compact density on data-heavy surfaces.

10) Where to leave Origin UI inserts

Wherever you see a high-level pattern (Navbar, SaaS Dashboard, AI Chat, Date Range, File Upload, Timeline, Stepper, Banner), create a wrapper file in components/origin/... and paste the Origin CLI/generated code there.

Keep our wrappers (TableCard, ChartCard, TableToolbar, MarkdownRenderer) and compose them with Origin bits.

End of Prompt 1



SaaS Dashboard Layout- fetch from https://github.com/origin-space/ui-experiments/tree/main/apps/experiment-03

navbar- extract from the SaaS Dashboard Layout
Sidebar- extract from the SaaS Dashboard layout

breadcrumb- extract from the SaaS Dashboard Layout

tabs (origin ui)- pnpm dlx shadcn@latest add https://originui.com/r/comp-434.json

alert dialog (origin up) - pnpm dlx shadcn@latest add https://originui.com/r/comp-314.json

dialog (signup) (origin ui)- pnpm dlx shadcn@latest add https://originui.com/r/comp-325.json

dialog (sign in)- pnpm dlx shadcn@latest add https://originui.com/r/comp-326.json


avatar (Shadcn)- pnpm dlx shadcn@latest add avatar

dropdown menu (shadcn)- pnpm dlx shadcn@latest add dropdown-menu

stats/kpi cards (origin UI)- extract from SaaS Dahsboard Layout 

Card for chart/table wrappers(Origin UI)- pnpm dlx shadcn@latest add card

table and table toolbar (origin ui)- pnpm dlx shadcn@latest add https://originui.com/r/comp-478.json

form react-hook (shadcn)- pnpm dlx shadcn@latest add form

combobox (origin ui)- pnpm dlx shadcn@latest add https://originui.com/r/comp-233.json

date picker (origin ui)- pnpm dlx shadcn@latest add https://originui.com/r/comp-36.json

file upload (origin ui)- pnpm dlx shadcn@latest add https://originui.com/r/comp-545.json

Toast (Origin UI)- pnpm dlx shadcn@latest add https://originui.com/r/comp-545.json

Alert (shadcn)-pnpm dlx shadcn@latest add alert

Sheet (shadcn)- pnpm dlx shadcn@latest add sheet

Dialog for confirmations (origin ui)- pnpm dlx shadcn@latest add https://originui.com/r/comp-314.json

AI Chat Layout (Origin UI) fetch from this link- https://github.com/origin-space/ui-experiments/tree/main/apps/experiment-01

Markdown renderer- extract from AI chat layout

Textarea- Extract from AI Chat Layout

Timeline (Origin UI)- pnpm dlx shadcn@latest add https://originui.com/r/comp-533.json

Calendar for scheduling (Origin UI)- pnpm dlx shadcn@latest add https://originui.com/r/comp-503.json

Stepper (origin UI)- pnpm dlx shadcn@latest add https://originui.com/r/comp-516.json

notification(origin ui)- pnpm dlx shadcn@latest add https://originui.com/r/comp-129.json

