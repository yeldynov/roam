import {UserIcon} from '@sanity/icons/User'
import {defineField, defineType} from 'sanity'

export const host = defineType({
  name: 'host',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string'})],
    }),
    defineField({name: 'bio', type: 'text', rows: 4}),
  ],
  preview: {select: {title: 'name', media: 'photo'}},
})
