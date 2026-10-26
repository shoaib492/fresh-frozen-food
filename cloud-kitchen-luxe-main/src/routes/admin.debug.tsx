import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { Loader2, Sparkles, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { pageHead } from '@/lib/brand'
import { analyzeBuildError, type BuildAnalysis } from '@/lib/debug.functions'

export const Route = createFileRoute('/admin/debug')({
  head: () => pageHead('Build doctor · Fresh Frozen Food', 'Paste build output and get likely causes and targeted fixes for this project.'),
  component: BuildDoctorPage,
})

const EXAMPLE_OUTPUT = `src/routes/checkout.tsx(46,138): error TS4111: Property 'name' comes from an index signature, so it must be accessed with ['name'].
src/routes/menu.tsx(12,40): error TS2322: Type '"/admmin"' is not assignable to type '"." | ".." | "/" | "/checkout" | "/menu"'.`

const MAX_CHARS = 12000

function BuildDoctorPage() {
  const analyze = useServerFn(analyzeBuildError)
  const [errorText, setErrorText] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [failure, setFailure] = useState('')
  const [result, setResult] = useState<BuildAnalysis | null>(null)

  const tooShort = errorText.trim().length < 20
  const tooLong = errorText.length > MAX_CHARS

  async function run() {
    setFailure(''); setResult(null)
    if (tooShort || tooLong) return
    setLoading(true)
    try {
      setResult(await analyze({ data: { errorText, notes } }))
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'The analysis could not be completed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-8 pt-8">
      <div>
        <span className="eyebrow text-primary">Build doctor</span>
        <h1 className="flex items-center gap-3 text-3xl font-semibold"><Stethoscope className="size-6" /> Diagnose a build error.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Paste build, typecheck or runtime output below. The assistant reads it against this project's actual stack and returns likely causes with targeted fixes — no error leaves the staff area.
        </p>
      </div>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="error-output">Build output</Label>
          <button type="button" className="text-xs text-muted-foreground underline underline-offset-2" onClick={() => setErrorText(EXAMPLE_OUTPUT)}>
            Fill with an example
          </button>
        </div>
        <Textarea
          id="error-output"
          value={errorText}
          onChange={(event) => setErrorText(event.target.value)}
          rows={10}
          placeholder="Paste the error here — typecheck output, a Vite failure, a stack trace…"
          className="font-mono text-xs"
          aria-invalid={tooLong}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{errorText.length}/{MAX_CHARS} characters</span>
          {tooLong && <span className="text-destructive">Too long — trim to the relevant error lines.</span>}
        </div>
        <div>
          <Label htmlFor="context-notes">Context (optional)</Label>
          <Textarea
            id="context-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="What were you changing when this appeared?"
          />
        </div>
        {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        <div>
          <Button variant="editorial" onClick={run} disabled={loading || tooShort || tooLong}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? 'Reading your output…' : 'Analyse error'}
          </Button>
          {tooShort && !loading && <p className="mt-2 text-xs text-muted-foreground">Paste at least a few lines of the build output first.</p>}
        </div>
      </section>

      {result && (
        <section className="grid gap-6 rounded-sm border border-border p-6" aria-live="polite">
          <div>
            <h2 className="text-lg font-semibold">What the doctor found</h2>
            <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
          </div>
          {result.likelyCauses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Likely causes</h3>
              <ul className="mt-2 grid gap-3">
                {result.likelyCauses.map((cause, index) => (
                  <li key={index} className="border-l-2 border-primary pl-4">
                    <p className="text-sm font-medium">{index + 1}. {cause.title}</p>
                    <p className="text-sm text-muted-foreground">{cause.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.suggestedFixes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Suggested fixes</h3>
              <ul className="mt-2 grid gap-3">
                {result.suggestedFixes.map((fix, index) => (
                  <li key={index} className="text-sm">
                    <span className="mr-2 inline-block rounded-sm bg-muted px-2 py-0.5 font-mono text-xs">{fix.target}</span>
                    {fix.action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Suggestions are advisory. Apply them in the usual way and re-check the build output afterwards.</p>
        </section>
      )}
    </div>
  )
}
