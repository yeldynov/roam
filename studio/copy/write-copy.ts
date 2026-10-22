// Run from studio/: npx sanity exec copy/write-copy.ts --with-user-token [-- --check]
// Writes each stay's description with Agent Actions from its typed fields only, and keeps it only
// when the code check and the Prompt judge both find nothing invented. --check audits, writes nothing.
import {getCliClient} from 'sanity/cli'

import {FACTS_PROJECTION, findUnsupported, type Facts} from './grounding'

const CHECK_ONLY = process.argv.includes('--check')
const ATTEMPTS = 3

const client = getCliClient({apiVersion: 'vX', perspective: 'published', useCdn: false})

const factsParam = (id: string) => ({
  type: 'groq' as const,
  query: `*[_id == $id][0]${FACTS_PROJECTION}`,
  params: {id},
})

async function generate(id: string, avoid: string[]) {
  const doc = await client.agent.action.generate({
    schemaId: '_.schemas.default',
    // An in-memory stay, so the old description is never in the model's context
    targetDocument: {operation: 'create', _type: 'property'},
    noWrite: true,
    target: {path: 'description'},
    instruction: `Write the description of a vacation rental using only the facts in $facts.
Two short paragraphs, 60 to 110 words in total, plain text, with one blank line between the paragraphs.
Only state what $facts says or directly implies. Do not mention price, rating, reviews, distances, nearby places, landmarks, history, building materials, views, seasons, activities, or any feature, room, or furniture not listed.
Mention pets only as $facts states them.
Do not make these claims, which a reviewer rejected in an earlier draft: $avoid`,
    instructionParams: {
      facts: factsParam(id),
      avoid: {type: 'constant', value: avoid.length ? avoid.join('; ') : 'none'},
    },
  })
  const copy = (doc as {description?: string}).description?.trim()
  if (!copy) throw new Error(`no description generated for ${id}`)
  return copy
}

type Verdict = {unsupported?: {claim: string; why: string}[]}

async function judge(id: string, copy: string): Promise<string[]> {
  // The client types every prompt response as string; with format 'json' it's the parsed object
  const res = (await client.agent.action.prompt({
    instruction: `You check vacation rental copy for invented facts. $facts is everything known about the stay. $copy is the copy.
List every claim in $copy that $facts does not state or directly imply: features, rooms, furniture, places, distances, numbers, views, history, activities, or surroundings.
Mood words that follow from the tags (quiet, cozy, romantic) are fine.
Respond in JSON: {"unsupported": [{"claim": "the words from the copy", "why": "what the facts say instead"}]}. Use an empty array when nothing is invented.`,
    instructionParams: {facts: factsParam(id), copy: {type: 'constant', value: copy}},
    format: 'json',
    temperature: 0,
  })) as unknown as Verdict
  return (res.unsupported ?? []).map((u) => `${u.claim} (${u.why})`)
}

async function check(id: string, facts: Facts, copy: string) {
  const code = findUnsupported(copy, facts)
  // The judge costs an Agent Actions call, so skip it when code already failed the copy
  return code.length ? code : judge(id, copy)
}

type Stay = Facts & {_id: string; description?: string}
const stays = await client.fetch<Stay[]>(
  `*[_type == "property"] | order(title asc){_id, description, ...${FACTS_PROJECTION}}`,
)
const failed: string[] = []

for (const stay of stays) {
  if (CHECK_ONLY) {
    const issues = stay.description ? await check(stay._id, stay, stay.description) : ['no description']
    console.log(`${issues.length ? 'FAIL' : 'pass'} ${stay.title}${issues.map((i) => `\n    - ${i}`).join('')}`)
    if (issues.length) failed.push(stay.title)
    continue
  }

  let copy = ''
  let issues: string[] = []
  try {
    // A re-run only spends Agent Actions on stays whose current copy fails
    if (stay.description && !(await check(stay._id, stay, stay.description)).length) {
      console.log(`keep ${stay.title}`)
      continue
    }
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      copy = await generate(stay._id, issues)
      issues = await check(stay._id, stay, copy)
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
