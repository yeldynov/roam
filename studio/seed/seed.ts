// Run from studio/: npx sanity exec seed/seed.ts --with-user-token
// Safe to re-run: documents are matched by _type + slug and their seeded fields are set in place;
// nothing is deleted. Stay descriptions belong to copy/write-copy.ts: run it after adding stays.
import {getCliClient} from 'sanity/cli'

import {hosts, policies, stays, unsplash} from './data'

const client = getCliClient({apiVersion: '2026-10-21', perspective: 'published', useCdn: false})
const counts = {created: 0, updated: 0}

type Doc = {_type: string; slug: {_type: 'slug'; current: string}} & Record<string, unknown>

const slug = (current: string) => ({_type: 'slug' as const, current})
const ref = (_ref: string) => ({_type: 'reference' as const, _ref})

// Sanity dedupes assets by content hash, so re-uploading the same photo returns the existing asset
async function image([id, alt]: [string, string], label: string) {
  const res = await fetch(unsplash(id))
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`${label}: photo ${id} returned ${res.status}`)
  }
  const asset = await client.assets.upload('image', Buffer.from(await res.arrayBuffer()), {filename: `${id}.jpg`})
  return {_type: 'image' as const, asset: ref(asset._id), alt}
}

async function upsert(doc: Doc) {
  const _id = await client.fetch<string | null>('*[_type == $type && slug.current == $slug][0]._id', {
    type: doc._type,
    slug: doc.slug.current,
  })
  if (_id) {
    // set, not replace: fields the seed doesn't own (a stay's description) survive a re-run
    const {_type, ...fields} = doc
    await client.patch(_id).set(fields).commit()
    counts.updated++
    console.log(`updated ${doc._type} ${doc.slug.current}`)
    return _id
  }
  const created = await client.create(doc)
  counts.created++
  console.log(`created ${doc._type} ${doc.slug.current}`)
  return created._id
}

const policyIds = new Map<string, string>()
for (const {slug: s, ...p} of policies) {
  policyIds.set(s, await upsert({_type: 'policy', slug: slug(s), ...p}))
}

const hostIds = new Map<string, string>()
for (const {slug: s, photo, ...h} of hosts) {
  hostIds.set(s, await upsert({_type: 'host', slug: slug(s), photo: await image(photo, h.name), ...h}))
}

for (const {slug: s, host, cancellation, photos, ...stay} of stays) {
  const hostId = hostIds.get(host)
  const policyId = policyIds.get(cancellation)
  if (!hostId || !policyId) throw new Error(`${stay.title}: unknown host "${host}" or policy "${cancellation}"`)
  // Upload every photo before writing, so a broken photo leaves the stay untouched
  const uploaded = await Promise.all(photos.map((p) => image(p, stay.title)))
  await upsert({
    _type: 'property',
    slug: slug(s),
    ...stay,
    host: ref(hostId),
    cancellationPolicy: ref(policyId),
    photos: uploaded.map((photo, i) => ({...photo, _key: `photo-${i}`})),
  })
}

console.log(`\n${counts.created} created, ${counts.updated} updated`)
