// AI Build Doctor: staff-only tool that analyses pasted build/compiler output
// against THIS project's stack and returns likely causes and targeted fixes.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { generateResponse } from '@lovable.dev/ai-gateway'

type StaffContext = { supabase: any; userId: string }

async function assertStaff(context: StaffContext) {
  const roles = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId)
  if (roles.error || !roles.data?.some((row: { role: string }) => row.role === 'admin' || row.role === 'staff')) {
    throw new Error('Staff access required.')
  }
}

const analyzeInput = z.object({
  // Pasted build/compiler/runtime output. Length-bound to keep the model call cheap.
  errorText: z.string().trim().min(20, 'Paste at least a few lines of the build output.').max(12000, 'Build output is too long. Trim it to the relevant error lines (about 12,000 characters).'),
  notes: z.string().trim().max(500).default(''),
})

// Project brief so the model's suggestions target the existing code, not a generic template.
const PROJECT_BRIEF = `You are a senior engineer helping the team of "Fresh Frozen Food" — a premium frozen-food brand website for Pune (menu browsing, cart, cash-on-delivery ordering, staff admin).

Project facts (use these to target your advice):
- TanStack Start v1: React 19, Vite, TanStack Router with FILE ROUTES in src/routes (/, /menu, /story, /gallery, /delivery, /checkout, /order-confirmed, /admin/*). src/routeTree.gen.ts is generated — never edit it; a "not assignable to route path" type error means a Link/navigate points at a route file that does not exist or is misnamed.
- App-internal backend logic uses createServerFn from @tanstack/react-start (files named *.functions.ts in src/lib). Chain order is fixed: createServerFn({...}).inputValidator(...).handler(...). Server-only helpers live in *.server.ts and must NEVER be imported from route files or *.functions.ts (they ship to the client bundle). Raw HTTP endpoints only as file routes under src/routes/api/.
- TypeScript is strict with exactOptionalPropertyTypes (optional props cannot be passed explicit undefined; build objects with conditional spread instead) and noPropertyAccessFromIndexSignature (index-signature properties must be read with bracket notation, e.g. errors['name']).
- Tailwind CSS v4 configured through src/styles.css (theme variables; @import rules must stay at the top). Shared UI primitives in src/components/ui. Public site content/menu lives in src/lib/brand.ts.
- Backend is Lovable Cloud (Supabase): browser client from @/integrations/supabase/client (RLS applies); authenticated server functions use .middleware([requireSupabaseAuth]) and context.supabase; admin client from '@/integrations/supabase/client.server' loaded dynamically inside handlers only. Staff roles are rows in the user_roles table (role 'admin' or 'staff'); never privilege user-editable metadata.
- process.env.* may only be read inside server handlers; browser code uses import.meta.env.VITE_*.

Rules for your answer:
- Diagnose from the pasted output itself. Quote the decisive error line(s) in your explanation when useful.
- Suggest fixes that fit THIS stack (e.g. bracket notation, conditional spread, adding the missing route file, moving code into a handler, editing styles.css tokens). Never suggest installing another router, an App.tsx switcher, Supabase Edge Functions, or editing routeTree.gen.ts.
- If the paste is too fragmented to be sure, say so in the summary and give the most probable causes ranked.
- Reply with ONLY a JSON object, no markdown fences, matching exactly:
{"summary": string (2-3 plain-English sentences: what broke and why), "likelyCauses": [{"title": string, "explanation": string}] (1-4 items, ranked most likely first), "suggestedFixes": [{"target": string (file path or area, e.g. "src/routes/checkout.tsx"), "action": string (concrete change to make)}] (1-5 items)}`

// Extracts the assistant text from a Responses-API JSON body.
function extractResponseText(response: unknown): string {
  const body = response as { output_text?: unknown; output?: unknown[] }
  if (typeof body.output_text === 'string' && body.output_text.trim()) return body.output_text
  const parts: string[] = []
  for (const item of body.output ?? []) {
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      const text = (part as { text?: unknown }).text
      if (typeof text === 'string') parts.push(text)
    }
  }
  return parts.join('\n')
}

// Tolerant parse: accepts fenced or bare JSON and falls back to a single raw note.
function parseAnalysis(raw: string, errorText: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
        summary?: unknown; likelyCauses?: unknown; suggestedFixes?: unknown
      }
      const causes = (Array.isArray(parsed.likelyCauses) ? parsed.likelyCauses : [])
        .map((item) => item as { title?: unknown; explanation?: unknown })
        .filter((item) => typeof item.title === 'string' && typeof item.explanation === 'string')
        .slice(0, 4)
        .map((item) => ({ title: item.title as string, explanation: item.explanation as string }))
      const fixes = (Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes : [])
        .map((item) => item as { target?: unknown; action?: unknown })
        .filter((item) => typeof item.action === 'string')
        .slice(0, 5)
        .map((item) => ({ target: typeof item.target === 'string' ? item.target : 'Project', action: item.action as string }))
      if (typeof parsed.summary === 'string' && (causes.length || fixes.length)) {
        return { summary: parsed.summary, likelyCauses: causes, suggestedFixes: fixes }
      }
    } catch { /* fall through to raw rendering */ }
  }
  return {
    summary: 'The model could not return a structured analysis for this paste. Here is its raw reading of the output.',
    likelyCauses: [{ title: 'Unstructured response', explanation: raw.slice(0, 4000) || `No analysis could be produced for: ${errorText.slice(0, 200)}` }],
    suggestedFixes: [] as { target: string; action: string }[],
  }
}

export type BuildAnalysis = ReturnType<typeof parseAnalysis>

export const analyzeBuildError = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => analyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context)
    const prompt = [
      'A staff member pasted this build/compiler/runtime output from the Fresh Frozen Food project:',
      '',
      data.errorText,
      data.notes ? `\nExtra context from the staff member: ${data.notes}` : '',
    ].join('\n')

    let raw: string
    try {
      const response = await generateResponse({
        model: 'openai/gpt-6-astra',
        instructions: PROJECT_BRIEF,
        input: prompt,
        max_output_tokens: 2000,
      })
      raw = extractResponseText(response)
    } catch (error) {
      const name = (error as { name?: unknown })?.name
      const message = error instanceof Error ? error.message : String(error)
      if (name === 'PaymentRequiredError') throw new Error('The AI analysis is unavailable until workspace credits are topped up.')
      if (name === 'RateLimitError') throw new Error('The AI analysis is rate-limited right now. Please try again in a minute.')
      console.error('[build-doctor] gateway call failed:', message)
      throw new Error('The AI analysis could not be completed. Please try again shortly.')
    }
    if (!raw.trim()) throw new Error('The AI analysis returned nothing readable. Please try again.')
    return parseAnalysis(raw, data.errorText)
  })
