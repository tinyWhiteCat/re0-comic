import { z } from 'zod';

export const imageNameSchema = z.string().regex(/^[a-f0-9]{32}\.(png|jpg|webp)$/);
export const audioNameSchema = z.string().regex(/^[a-f0-9]{32}\.(mp3|wav|m4a)$/);
export const renderProviderSchema = z.enum(['local', 'openai']);
export const renderOptionsSchema = z.object({
  openai: z.object({ configured: z.boolean(), model: z.string().nullable() }),
});
export const narrationVoiceSchema = z.enum(['Leda', '冰糖']);
export const narrationOptionsSchema = z.object({
  defaultVoice: narrationVoiceSchema,
  voices: z.array(z.object({ value: narrationVoiceSchema, label: z.string(), configured: z.boolean() })),
});
export const narrationVoiceSelectionSchema = z.object({ voice: narrationVoiceSchema });
const narrationJobSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('generating') }),
  z.object({ status: z.literal('failed'), error: z.string() }),
]);
export const maxSceneDuration = 30;
export const sceneSchema = z.object({
  image: imageNameSchema,
  text: z.string().trim().max(500, '每个分镜解说最多 500 字'),
  duration: z.number().min(0.5, '分镜时长至少为 0.5 秒').max(maxSceneDuration, `分镜时长最多为 ${maxSceneDuration} 秒`),
});
export const projectSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{32}$/),
  title: z.string().max(100),
  ratio: z.enum(['portrait', 'landscape']),
  scenes: z.array(sceneSchema).max(100),
  audio: audioNameSchema.nullable(),
  status: z.enum(['draft', 'rendering', 'done', 'failed']),
  renderProvider: renderProviderSchema.optional(),
  error: z.string().nullable().optional(),
  narrationJob: narrationJobSchema.optional(),
  geminiTts: narrationJobSchema.optional(),
  narrationVoice: narrationVoiceSchema.optional(),
  narrationAudioVoice: narrationVoiceSchema.optional(),
});
export const saveSchema = projectSchema.pick({ title: true, ratio: true, scenes: true }).extend({
  removeAudio: z.boolean().optional(),
});
export type Scene = z.infer<typeof sceneSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SaveProject = z.infer<typeof saveSchema>;
export type RenderProvider = z.infer<typeof renderProviderSchema>;
export type RenderOptions = z.infer<typeof renderOptionsSchema>;
export type NarrationOptions = z.infer<typeof narrationOptionsSchema>;
export type NarrationVoice = z.infer<typeof narrationVoiceSchema>;
