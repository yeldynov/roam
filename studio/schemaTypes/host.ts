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
    defineField({
      name: 'clerkOrgId',
      title: 'Clerk organization ID',
      type: 'string',
      description: "Clerk organization that manages this host's stays (org_…). Its members edit them in the app.",
      validation: (rule) =>
        rule
          .regex(/^org_[A-Za-z0-9]+$/, {name: 'Clerk organization ID'})
          .custom(async (value, context) => {
            if (!value) return true
            const id = context.document?._id.replace(/^drafts\./, '')
            const taken = await context
              .getClient({apiVersion: '2025-02-19'})
              .fetch<boolean>(
                'count(*[_type == "host" && clerkOrgId == $value && !(_id in [$id, "drafts." + $id])]) > 0',
                {value, id},
              )
            return taken ? 'Another host already uses this organization' : true
          }),
    }),
  ],
  preview: {select: {title: 'name', media: 'photo'}},
})
