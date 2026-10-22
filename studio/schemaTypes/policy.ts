import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {defineField, defineType} from 'sanity'

// Cancellation policies are referenced by stays; the other kinds apply to every stay
export const POLICY_KINDS = [
  {title: 'Cancellation', value: 'cancellation'},
  {title: 'Booking', value: 'booking'},
  {title: 'Payment', value: 'payment'},
  {title: 'Pets', value: 'pets'},
  {title: 'Damage', value: 'damage'},
  {title: 'Check-in', value: 'checkIn'},
  {title: 'Conduct', value: 'conduct'},
]

export const policy = defineType({
  name: 'policy',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'kind',
      type: 'string',
      options: {list: POLICY_KINDS},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      type: 'string',
      description: 'One line shown on a stay',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'freeCancellationHours',
      type: 'number',
      description: 'Hours before check-in that guests can cancel for a full refund. 0 = never.',
      hidden: ({document}) => document?.kind !== 'cancellation',
      validation: (rule) =>
        rule.integer().min(0).custom((n, {document}) =>
          document?.kind === 'cancellation' && n === undefined ? 'Required for cancellation policies' : true,
        ),
    }),
    defineField({
      name: 'body',
      type: 'text',
      rows: 10,
      description: 'Plain paragraphs separated by a blank line. Quoted to guests word for word.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'kind'}},
})
