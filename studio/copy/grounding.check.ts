// Run from studio/: npx tsx copy/grounding.check.ts
import {findUnsupported, type Facts} from './grounding'

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message)
}

const cabin: Facts = {
  title: 'Modern Cabin with Hot Tub',
  propertyType: 'cabin',
  setting: 'mountains',
  location: {city: 'Lake Arrowhead', region: 'CA', country: 'United States'},
  maxGuests: 4,
  bedrooms: 2,
  beds: 2,
  bathrooms: 1,
  amenities: ['hotTub', 'fireplace', 'wifi', 'parking', 'kitchen'],
  petsAllowed: true,
  tags: ['quiet', 'cozy', 'forest', 'secluded'],
  houseRules: ['Quiet hours are 10 pm to 8 am.', 'Up to 2 dogs are welcome. Please keep them off the beds.'],
  checkInTime: '16:00',
  checkOutTime: '11:00',
}

const grounded = `A quiet, cozy cabin in the mountains of Lake Arrowhead, CA, with two bedrooms for up to four guests. Soak in the hot tub, then warm up by the fireplace.

The kitchen, Wi-Fi and parking cover the basics. Up to 2 dogs are welcome. Check in from 4 pm.`
assert(findUnsupported(grounded, cabin).length === 0, `grounded copy flagged: ${findUnsupported(grounded, cabin)}`)

const landmark = findUnsupported('Walk to Haystack Rock from the door.', cabin)
assert(landmark.some((i) => i.includes('Haystack')), `landmark not flagged: ${landmark}`)

const number = findUnsupported('Sleeps six guests in 3 bedrooms.', cabin)
assert(number.some((i) => i.includes('six')) && number.some((i) => i.includes('"3"')), `numbers not flagged: ${number}`)

const noTub = {...cabin, title: 'Modern Cabin', amenities: ['wifi']}
const tub = findUnsupported('Relax in the hot tub.', noTub)
assert(tub.some((i) => i.includes('hot tub')), `unlisted hot tub not flagged: ${tub}`)

const deck = findUnsupported('Grill on the deck, then walk the trails nearby.', cabin)
assert(deck.length >= 3, `deck/grill/trails/nearby not flagged: ${deck}`)

// A whole document passed as facts: its own description must not back its claims
const withCopy = {...cabin, description: 'Walk to Haystack Rock.'} as Facts
assert(findUnsupported('Walk to Haystack Rock.', withCopy).length > 0, 'description vouched for itself')

console.log('grounding ok')
