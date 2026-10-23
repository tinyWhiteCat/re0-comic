import { z } from 'zod';

export const imageNameSchema = z.string().regex(/^[a-f0-9]{32}\.(png|jpg|webp)$/);
export const audioNameSchema = z.string().regex(/^[a-f0-9]{32}\.(mp3|wav|m4a)$/);
export const sceneSchema = z.object({
  image: imageNameSchema,
  text: z.string().trim().max(500, '每个分镜解说最多 500 字'),
  duration: z.number().min(0.5, '分镜时长至少为 0.5 秒').max(30, '分镜时长最多为 30 秒'),
});
export const projectSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{32}$/),
  title: z.string().max(100),
  ratio: z.enum(['portrait', 'landscape']),
  scenes: z.array(sceneSchema).max(100),
  audio: audioNameSchema.nullable(),
  status: z.enum(['draft', 'rendering', 'done', 'failed']),
  error: z.string().nullable().optional(),
});
export const saveSchema = projectSchema.pick({ title: true, ratio: true, scenes: true }).extend({
  removeAudio: z.boolean().optional(),
});
export type Scene = z.infer<typeof sceneSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SaveProject = z.infer<typeof saveSchema>;
