import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const shared = {
  title: z.string().optional(),
  id: z.string().optional(),
  order: z.number().optional(),
  next: z.string().optional(),
  author: z.string().optional(),
  readableDate: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  permalink: z.string().optional(),
  layout: z.string().optional(),
  draft: z.boolean().optional(),
  changeFreq: z.string().optional(),
  pagination: z.unknown().optional(),
  eleventyComputed: z.unknown().optional(),
};

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/docs' }),
  schema: z.object(shared),
});

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/blog' }),
  schema: z.object(shared),
});

const repositoryIds = new Map([
  ['CONTRIBUTORS.md', 'community'],
  ['CONTRIBUTING.md', 'contributing'],
  ['packages/cssnano/CHANGELOG.md', 'changelog'],
]);

const repository = defineCollection({
  loader: glob({
    pattern: [
      'CONTRIBUTORS.md',
      'CONTRIBUTING.md',
      'packages/cssnano/CHANGELOG.md',
    ],
    base: '..',
    generateId: ({ entry }) => repositoryIds.get(entry) ?? entry,
  }),
  schema: z.object({}),
});

export const collections = { docs, blog, repository };
