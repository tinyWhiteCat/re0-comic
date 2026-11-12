import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type ObjectValue = Record<string, unknown>;
export interface IntroContract {
  version: string;
  displayText: string;
  allowedSpeechTexts: string[];
  forbiddenSpeechFragments: string[];
  sourceRequirement: string;
}
export interface IntroIdentity {
  policyVersion: string;
  policySha256: string;
  displayText: string;
  speechText: string;
  model: string;
  voice: string;
  synthesisParameters: { plan: ObjectValue; group: ObjectValue; requestContext: unknown };
}
const object = (value: unknown, label: string): ObjectValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as ObjectValue;
};
const string = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
};
function canonicalValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue((value as ObjectValue)[key])]));
  throw new Error('Cache identity must contain only JSON values');
}
export const stableJson = (value: unknown): string => JSON.stringify(canonicalValue(value));
export const sha256 = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');
export const identitySha256 = (identity: IntroIdentity): string => sha256(stableJson(identity));

export async function loadIntroContract(file: string | URL = new URL('../../.agents/skills/re0-arc7-comic-video/references/intro-contract.json', import.meta.url)): Promise<IntroContract> {
  const parsed = object(JSON.parse(await readFile(file, 'utf8')), 'Intro contract');
  for (const name of ['version', 'displayText', 'sourceRequirement']) string(parsed[name], `Contract ${name}`);
  for (const name of ['allowedSpeechTexts', 'forbiddenSpeechFragments']) {
    if (!Array.isArray(parsed[name]) || !parsed[name].length || parsed[name].some(value => typeof value !== 'string' || !value)) throw new Error(`Contract ${name} must contain non-empty strings`);
  }
  return parsed as unknown as IntroContract;
}

export function validateIntroPlan(planValue: unknown, policy: IntroContract, directionValue?: unknown, requestContext: unknown = null): IntroIdentity {
  const plan = object(planValue, 'Current synthesis plan');
  if (!Array.isArray(plan.groups)) throw new Error('Current synthesis plan must contain groups');
  const intros = plan.groups.filter(group => group && typeof group === 'object' && group.id === 'intro');
  if (intros.length !== 1) throw new Error('Current plan must contain exactly one intro group');
  const intro = object(intros[0], 'Intro group');
  const speechText = string(intro.text ?? intro.speechText, 'Intro speech text');
  if (intro.text !== undefined && intro.speechText !== undefined && intro.text !== intro.speechText) throw new Error('Intro text and speechText disagree');
  if (policy.forbiddenSpeechFragments.some(fragment => speechText.includes(fragment))) throw new Error('Intro violates current RE0 reading: the Chinese title expansion is forbidden');
  if (!policy.allowedSpeechTexts.includes(speechText)) throw new Error('Intro speech text is not allowed by the current RE0 contract');
  if (intro.displayText !== undefined && intro.displayText !== policy.displayText) throw new Error('Intro display text differs from the independent contract');
  const model = string(intro.model ?? plan.model, 'Intro model');
  const voice = string(intro.voice ?? plan.voice, 'Intro voice');
  if (directionValue !== undefined) {
    const direction = object(directionValue, 'Voice direction');
    if (!Array.isArray(direction.groups)) throw new Error('Voice direction must contain groups');
    const groups = direction.groups.filter(group => group && typeof group === 'object' && group.id === 'intro');
    if (groups.length !== 1 || groups[0].displayText !== policy.displayText || groups[0].speechText !== speechText) throw new Error('Voice direction intro differs from the current contract and plan');
    if ((groups[0].model !== undefined && groups[0].model !== model) || (groups[0].voice !== undefined && groups[0].voice !== voice)) throw new Error('Voice direction intro model or voice differs from the current plan');
    for (const overrideValue of Array.isArray(direction.pronunciationOverrides) ? direction.pronunciationOverrides : []) {
      const override = object(overrideValue, 'Pronunciation override');
      if (override.scope === 'body') continue;
      const from = String(override.display ?? override.text ?? '');
      const replacement = String(override.speech ?? override.spoken ?? '');
      const brand = /^Re\s*:?\s*0$/i.test(from) || policy.allowedSpeechTexts.some(text => text.split('，')[0] === from);
      if (override.scope === 'intro' || (from && (policy.displayText.includes(from) || speechText.includes(from)))) {
        if (policy.forbiddenSpeechFragments.some(fragment => replacement.includes(fragment))) throw new Error('Pronunciation override expands RE0 into the Chinese title');
        if (from === policy.displayText && replacement !== speechText) throw new Error('Whole-intro pronunciation override disagrees with the current plan');
        if (brand && !policy.allowedSpeechTexts.some(text => text.split('，')[0] === replacement)) throw new Error('Brand pronunciation override is not an allowed literal RE0 reading');
      }
    }
  }
  if (requestContext !== null) {
    const context = object(requestContext, 'Actual synthesis request context');
    string(context.endpoint, 'Actual synthesis endpoint');
    const body = object(context.body, 'Actual synthesis body');
    const audio = object(body.audio, 'Actual synthesis audio parameters');
    if (body.model !== model || audio.voice !== voice) throw new Error('Actual synthesis request model or voice differs from the CURRENT plan');
    string(audio.format, 'Actual synthesis audio format');
    if (!Array.isArray(body.messages) || body.messages.length !== 1) throw new Error('Actual synthesis request must contain one exact assistant utterance');
    const message = object(body.messages[0], 'Actual synthesis utterance');
    if (message.role !== 'assistant' || message.content !== speechText) throw new Error('Actual synthesis request speech differs from the CURRENT plan');
  }
  const without = (value: ObjectValue, keys: string[]): ObjectValue => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
  const identity: IntroIdentity = {
    policyVersion: policy.version, policySha256: sha256(stableJson(policy)), displayText: policy.displayText, speechText, model, voice,
    synthesisParameters: { plan: without(plan, ['groups', 'model', 'voice']), group: without(intro, ['id', 'text', 'speechText', 'displayText', 'model', 'voice']), requestContext },
  };
  stableJson(identity);
  return identity;
}

export function introCacheMetadata(identity: IntroIdentity, audioSha256: string) {
  return { identity, identitySha256: identitySha256(identity), audioSha256 };
}

export async function readIntroContentVerification(file: string) {
  try {
    const verification = object(JSON.parse(await readFile(file, 'utf8')), 'Intro content verification');
    const evidenceFile = path.resolve(path.dirname(file), string(verification.evidenceFile, 'Intro verification evidenceFile'));
    return { verification, evidenceBytes: await readFile(evidenceFile) };
  } catch (error) {
    throw new Error(`Intro content evidence cannot be read: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function validateIntroCache(identity: IntroIdentity, recordValue: unknown, audioBytes: Uint8Array, verificationValue?: unknown, evidenceBytes?: Uint8Array): void {
  const record = object(recordValue, 'Intro cache record');
  const metadata = object(record.introContract, 'Intro cache introContract metadata');
  // Selection flags describe history; they never authorize reuse by themselves.
  if (record.text !== identity.speechText || record.model !== identity.model || record.voice !== identity.voice) throw new Error('Cached intro text, model or voice differs from the CURRENT request');
  if (metadata.identitySha256 !== identitySha256(identity) || stableJson(metadata.identity) !== stableJson(identity)) throw new Error('Cached intro policy or synthesis parameters are stale');
  const actual = sha256(audioBytes);
  if (record.audioSha256 !== actual || metadata.audioSha256 !== actual) throw new Error('Cached intro audio bytes do not match the bound SHA-256');
  const verification = object(verificationValue, 'Independent intro content verification');
  if (verification.policySha256 !== identity.policySha256 || verification.audioSha256 !== actual) throw new Error('Intro content verification is bound to another audio or policy');
  if (verification.literalBrandVerified !== true || verification.yuanZhuVerified !== true) throw new Error('Intro content verification must explicitly check RE0 and yuan-zhu');
  if (!evidenceBytes || verification.evidenceSha256 !== sha256(evidenceBytes)) throw new Error('Independent intro evidence bytes do not match the bound SHA-256');
  const evidence = object(JSON.parse(Buffer.from(evidenceBytes).toString('utf8')), 'Independent intro source evidence');
  if ((evidence.audioSha256 ?? evidence.sha256) !== actual) throw new Error('Independent intro source evidence refers to another audio');
  if (verification.method === 'raw-asr') {
    const recognized = string(evidence.recognizedText, 'Raw ASR recognizedText').normalize('NFKC').replace(/[\s\p{P}]/gu, '').toLowerCase();
    if (!/^re(?:0|零|zero)帝国篇原[著住]解说$/.test(recognized)) throw new Error('Raw ASR does not independently verify the literal RE0 and yuan-zhu reading');
    const rawText = object(evidence.rawResult, 'Raw ASR source result').text;
    if (string(rawText, 'Raw ASR result text').normalize('NFKC').replace(/[\s\p{P}]/gu, '').toLowerCase() !== recognized) throw new Error('Raw ASR recognizedText differs from the source result');
  } else if (verification.method === 'listening') {
    if (evidence.actualListening !== true || evidence.literalBrandVerified !== true || evidence.yuanZhuVerified !== true) throw new Error('Listening evidence must record actual listening and the specific reading checks');
  } else throw new Error('Intro content verification method must be raw-asr or listening');
}
