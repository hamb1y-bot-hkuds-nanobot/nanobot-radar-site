import { defineCollection, z } from 'astro:content';

const chronicles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().min(1),
    issue: z.number().int().positive().optional(),
  }),
});

export const collections = { chronicles };
