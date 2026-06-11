import { z } from 'zod';

export const directoryQuerySchema = z.object({
  district: z.string().optional(),
  department: z.string().optional(),
  category: z.enum(['office', 'scheme', 'contact', 'resource']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export type DirectoryQueryInput = z.infer<typeof directoryQuerySchema>;
