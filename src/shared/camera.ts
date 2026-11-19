import { z } from 'zod';

export const cameraPlanSchema = z.object({
  shots: z.array(z.object({
    index: z.number().int().nonnegative(),
    camera: z.enum(['hold', 'push_in', 'pull_out', 'pan_left', 'pan_right']),
    focusX: z.number().min(0).max(1),
    focusY: z.number().min(0).max(1),
    transition: z.enum(['cut', 'fade']),
  }).strict()).min(1).max(100),
}).strict();

export type CameraPlan = z.infer<typeof cameraPlanSchema>;
