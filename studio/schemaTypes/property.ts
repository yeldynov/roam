import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'

// Guests filter on every typed field here; description and tags are what embeddings rank
export const PROPERTY_TYPES = ['cabin', 'cottage', 'house', 'apartment', 'loft', 'villa', 'bungalow']
export const SETTINGS = ['mountains', 'forest', 'lake', 'beach', 'desert', 'city', 'countryside']
export const AMENITIES = [
  {title: 'Hot tub', value: 'hotTub'},
  {title: 'Pool', value: 'pool'},
  {title: 'Fireplace', value: 'fireplace'},
  {title: 'Wi-Fi', value: 'wifi'},
  {title: 'Kitchen', value: 'kitchen'},
  {title: 'Workspace', value: 'workspace'},
  {title: 'Parking', value: 'parking'},
  {title: 'Washer', value: 'washer'},
  {title: 'Air conditioning', value: 'airConditioning'},
  {title: 'BBQ grill', value: 'bbqGrill'},
  {title: 'EV charger', value: 'evCharger'},
  {title: 'Ocean view', value: 'oceanView'},
]

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export const property = defineType({
  name: 'property',
  title: 'Stay',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'basics', title: 'Basics', default: true},
    {name: 'capacity', title: 'Location & capacity'},
    {name: 'policy', title: 'Pricing & policy'},
    {name: 'content', title: 'Content'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'basics',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'basics',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'propertyType',
      type: 'string',
      group: 'basics',
      options: {list: PROPERTY_TYPES, layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'setting',
      type: 'string',
      group: 'basics',
      options: {list: SETTINGS, layout: 'radio', direction: 'horizontal'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'host',
      type: 'reference',
      group: 'basics',
      to: [{type: 'host'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      type: 'object',
      group: 'capacity',
      fields: [
        defineField({name: 'city', type: 'string', validation: (rule) => rule.required()}),
        defineField({
          name: 'region',
          type: 'string',
          description: 'Short form shown after the city: "CA", "Tuscany"',
          validation: (rule) => rule.required(),
        }),
        defineField({name: 'country', type: 'string', validation: (rule) => rule.required()}),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'maxGuests',
      type: 'number',
      group: 'capacity',
      validation: (rule) => rule.required().integer().min(1).max(16),
    }),
    defineField({
      name: 'bedrooms',
      type: 'number',
      group: 'capacity',
      description: '0 for a studio',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'beds',
      type: 'number',
      group: 'capacity',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'bathrooms',
      type: 'number',
      group: 'capacity',
      validation: (rule) =>
        rule
          .required()
          .min(0.5)
          .custom((n) => n === undefined || Number.isInteger(n * 2) || 'Use steps of 0.5'),
    }),
    defineField({
      name: 'amenities',
      type: 'array',
      group: 'capacity',
      of: [defineArrayMember({type: 'string'})],
      options: {list: AMENITIES, layout: 'grid'},
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'petsAllowed',
      type: 'boolean',
      group: 'capacity',
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'nightlyPrice',
      type: 'number',
      group: 'policy',
      description: 'Whole US dollars per night',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'cancellationPolicy',
      type: 'reference',
      group: 'policy',
      to: [{type: 'policy'}],
      options: {filter: 'kind == "cancellation"'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'checkInTime',
      type: 'string',
      group: 'policy',
      description: '24-hour HH:MM',
      validation: (rule) => rule.required().regex(TIME, {name: 'HH:MM'}),
    }),
    defineField({
      name: 'checkOutTime',
      type: 'string',
      group: 'policy',
      description: '24-hour HH:MM',
      validation: (rule) => rule.required().regex(TIME, {name: 'HH:MM'}),
    }),
    defineField({
      name: 'houseRules',
      type: 'array',
      group: 'policy',
      description: 'Shown to guests word for word',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({
      name: 'rating',
      type: 'number',
      group: 'policy',
      validation: (rule) => rule.min(0).max(5).precision(1),
    }),
    defineField({
      name: 'reviewCount',
      type: 'number',
      group: 'policy',
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'photos',
      type: 'array',
      group: 'content',
      description: 'The first photo is the cover',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', type: 'string', validation: (rule) => rule.required()})],
        }),
      ],
      validation: (rule) => rule.required().min(1).max(8),
    }),
    defineField({
      name: 'description',
      type: 'text',
      group: 'content',
      rows: 8,
      description: 'Plain paragraphs separated by a blank line. Semantic search reads this.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tags',
      type: 'array',
      group: 'content',
      description: 'Vibe words guests search for: quiet, cozy, romantic',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
    }),
  ],
  preview: {
    select: {title: 'title', city: 'location.city', region: 'location.region', price: 'nightlyPrice', media: 'photos.0'},
    prepare: ({title, city, region, price, media}) => ({
      title,
      subtitle: [city && region ? `${city}, ${region}` : city, price && `$${price}`].filter(Boolean).join(' · '),
      media,
    }),
  },
})
