import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { repositoryPages } from './_data/repositoryPages.js';

const docs = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/docs',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/blog' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    excerpt: z.string(),
    publishedAt: z.coerce.date(),
    // Not unused: the glob loader reads it as the entry ID, which sets the post URL.
    slug: z.string().min(1),
  }),
});

const repositoryIds = new Map(
  Object.entries(repositoryPages).map(([id, { file }]) => [file, id])
);

const repository = defineCollection({
  loader: glob({
    pattern: [...repositoryIds.keys()],
    base: '..',
    generateId: ({ entry }) => repositoryIds.get(entry) ?? entry,
  }),
  schema: z.object({}),
});

export const collections = { docs, blog, repository };
