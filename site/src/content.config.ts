import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const shared = {
  title: z.string().optional(),
  author: z.string().optional(),
  readableDate: z.string().optional(),
};

const docs = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!community.md', '!what-are-optimisations.md'],
    base: './src/docs',
  }),
  schema: z.object({ ...shared, title: z.string() }),
});

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/blog' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    readableDate: z.string(),
    slug: z.string().min(1),
  }),
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
