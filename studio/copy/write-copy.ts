// Run from studio/: npx sanity exec copy/write-copy.ts --with-user-token [-- --check]
// Writes each stay's description with Agent Actions from its typed fields only, and keeps it only
// when the code check and the Prompt judge both find nothing invented. --check audits, writes nothing.
import {PostHog} from 'posthog-node'
import {getCliClient} from 'sanity/cli'

import {FACTS_PROJECTION, findUnsupported, type Facts} from './grounding'

const CHECK_ONLY = process.argv.includes('--check')
const ATTEMPTS = 3

const client = getCliClient({apiVersion: 'vX', perspective: 'published', useCdn: false})
const posthogToken = process.env.POSTHOG_PROJECT_TOKEN
const posthogHost = process.env.POSTHOG_HOST

if (!posthogToken && process.env.NODE_ENV !== 'production') {
  console.error(
    new Error(
      'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured',
    ),
  )
}

if (!posthogHost && process.env.NODE_ENV !== 'production') {
  console.error(
    new Error(
      'POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured',
    ),
  )
}

const posthog = posthogToken && posthogHost
  ? new PostHog(posthogToken, {host: posthogHost, privacyMode: false})
  : undefined
const runId = crypto.randomUUID()

type Generation = {
  traceId: string
  name: string
  input: unknown
  output?: unknown
  error?: unknown
  latency: number
}

function captureGeneration({traceId, name, input, output, error, latency}: Generation) {
  const properties: Record<string, unknown> = {
    $ai_trace_id: traceId,
    $ai_session_id: runId,
    $ai_span_id: crypto.randomUUID(),
    $ai_parent_id: traceId,
    $ai_span_name: name,
    $ai_provider: 'sanity',
    $ai_input: [{role: 'user', content: JSON.stringify(input)}],
    $ai_latency: latency,
  }

  if (output !== undefined) properties.$ai_output_choices = [{role: 'assistant', content: JSON.stringify(output)}]
  if (error !== undefined) {
    properties.$ai_is_error = true
    properties.$ai_error = error instanceof Error ? error.message : String(error)
  }

  posthog?.capture({distinctId: runId, event: '$ai_generation', properties})
}

const factsParam = (id: string) => ({
  type: 'groq' as const,
  query: `*[_id == $id][0]${FACTS_PROJECTION}`,
  params: {id},
})

async function generate(id: string, avoid: string[], traceId: string) {
  const instruction = `Write the description of a vacation rental using only the facts in $facts.
Two short paragraphs, 60 to 110 words in total, plain text, with one blank line between the paragraphs.
Only state what $facts says or directly implies. Do not mention price, rating, reviews, distances, nearby places, landmarks, history, building materials, views, seasons, activities, or any feature, room, or furniture not listed.
Mention pets only as $facts states them.
Do not make these claims, which a reviewer rejected in an earlier draft: $avoid`
  const instructionParams = {
    facts: factsParam(id),
    avoid: {type: 'constant', value: avoid.length ? avoid.join('; ') : 'none'},
  }
  const startedAt = performance.now()

  try {
    const doc = await client.agent.action.generate({
      schemaId: '_.schemas.default',
      // An in-memory stay, so the old description is never in the model's context
      targetDocument: {operation: 'create', _type: 'property'},
      noWrite: true,
      target: {path: 'description'},
      instruction,
      instructionParams,
    })
    const copy = (doc as {description?: string}).description?.trim()
    if (!copy) throw new Error(`no description generated for ${id}`)
    captureGeneration({
      traceId,
      name: 'sanity_agent_generate',
      input: {instruction, instructionParams},
      output: copy,
      latency: (performance.now() - startedAt) / 1000,
    })
    return copy
  } catch (error) {
    captureGeneration({
      traceId,
      name: 'sanity_agent_generate',
      input: {instruction, instructionParams},
      error,
      latency: (performance.now() - startedAt) / 1000,
    })
    throw error
  }
}

type Verdict = {unsupported?: {claim: string; why: string}[]}

async function judge(id: string, copy: string, traceId: string): Promise<string[]> {
  const instruction = `You check vacation rental copy for invented facts. $facts is everything known about the stay. $copy is the copy.
List every claim in $copy that $facts does not state or directly imply: features, rooms, furniture, places, distances, numbers, views, history, activities, or surroundings.
Mood words that follow from the tags (quiet, cozy, romantic) are fine.
Respond in JSON: {"unsupported": [{"claim": "the words from the copy", "why": "what the facts say instead"}]}. Use an empty array when nothing is invented.`
  const instructionParams = {facts: factsParam(id), copy: {type: 'constant', value: copy}}
  const startedAt = performance.now()

  try {
    // The client types every prompt response as string; with format 'json' it's the parsed object
    const res = (await client.agent.action.prompt({
      instruction,
      instructionParams,
      format: 'json',
      temperature: 0,
    })) as unknown as Verdict
    captureGeneration({
      traceId,
      name: 'sanity_agent_judge',
      input: {instruction, instructionParams},
      output: res,
      latency: (performance.now() - startedAt) / 1000,
    })
    return (res.unsupported ?? []).map((u) => `${u.claim} (${u.why})`)
  } catch (error) {
    captureGeneration({
      traceId,
      name: 'sanity_agent_judge',
      input: {instruction, instructionParams},
      error,
      latency: (performance.now() - startedAt) / 1000,
    })
    throw error
  }
}

async function check(id: string, facts: Facts, copy: string, traceId: string) {
  const code = findUnsupported(copy, facts)
  // The judge costs an Agent Actions call, so skip it when code already failed the copy
  return code.length ? code : judge(id, copy, traceId)
}

type Stay = Facts & {_id: string; description?: string}
const stays = await client.fetch<Stay[]>(
  `*[_type == "property"] | order(title asc){_id, description, ...${FACTS_PROJECTION}}`,
)
const failed: string[] = []

for (const stay of stays) {
  const traceId = crypto.randomUUID()

  if (CHECK_ONLY) {
    const issues = stay.description ? await check(stay._id, stay, stay.description, traceId) : ['no description']
    console.log(`${issues.length ? 'FAIL' : 'pass'} ${stay.title}${issues.map((i) => `\n    - ${i}`).join('')}`)
    if (issues.length) failed.push(stay.title)
    continue
  }

  let copy = ''
  let issues: string[] = []
  try {
    // A re-run only spends Agent Actions on stays whose current copy fails
    if (stay.description && !(await check(stay._id, stay, stay.description, traceId)).length) {
      console.log(`keep ${stay.title}`)
      continue
    }
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      copy = await generate(stay._id, issues, traceId)
      issues = await check(stay._id, stay, copy, traceId)
      if (!issues.length) break
      console.log(`  retry ${stay.title} (attempt ${attempt}): ${issues.join('; ')}`)
    }
  } catch (error) {
    // One dropped request shouldn't stop the run; re-running picks this stay up again
    failed.push(stay.title)
    console.log(`ERROR ${stay.title}: ${(error as Error).message}`)
    continue
  }

  if (!issues.length) {
    await client.patch(stay._id).set({description: copy}).commit()
    console.log(`pass ${stay.title}`)
    continue
  }
  // Still invented after every attempt: park it in a draft for a person to review in Studio
  const published = await client.getDocument(stay._id)
  await client.createOrReplace({...published!, _id: `drafts.${stay._id}`, description: copy})
  failed.push(stay.title)
  console.log(`DRAFT ${stay.title}${issues.map((i) => `\n    - ${i}`).join('')}`)
}

console.log(`\n${stays.length - failed.length}/${stays.length} pass${failed.length ? `; ${CHECK_ONLY ? 'failing' : 'drafts'}: ${failed.join(', ')}` : ''}`)

try {
  await posthog?.shutdown()
} catch (error) {
  console.error('PostHog shutdown failed:', error)
}
