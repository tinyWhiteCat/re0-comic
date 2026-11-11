import { describe, expect, it } from 'vitest';
import { introCacheMetadata, loadIntroContract, sha256, validateIntroCache, validateIntroPlan, type IntroContract } from '../scripts/lib/re0-intro-contract.js';

const policy: IntroContract = {
  version: 'literal-re0-v1', displayText: 'Re:0 帝国篇原著解说。',
  allowedSpeechTexts: ['RE0，帝国篇原著解说。', 'RE0，帝国篇原住解说。', 'R E 零，帝国篇原著解说。', 'R E 零，帝国篇原住解说。'],
  forbiddenSpeechFragments: ['从零开始', '从零開始'], sourceRequirement: '片头直接念RE0，不能展开成中文作品名',
};
const plan = () => ({ model: 'mimo-v2.5-tts', voice: '冰糖', defaultSpeed: true, groups: [{ id: 'intro', text: 'RE0，帝国篇原住解说。' }, { id: 'shot-01', text: '正文。' }] });
const request = { endpoint: 'https://example.invalid/tts', body: { model: 'mimo-v2.5-tts', messages: [{ role: 'assistant', content: 'RE0，帝国篇原住解说。' }], audio: { format: 'wav', voice: '冰糖' } } };
const audio = Buffer.from('fixture audio bytes');
function fixture() {
  const current = plan();
  const identity = validateIntroPlan(current, policy, undefined, request);
  const evidenceBytes = Buffer.from(JSON.stringify({ sha256: sha256(audio), recognizedText: 'RE0帝国篇原著解说', rawResult: { text: 'RE0帝国篇原著解说' }, actualListening: false }));
  const verification = { policySha256: identity.policySha256, audioSha256: sha256(audio), method: 'raw-asr', literalBrandVerified: true, yuanZhuVerified: true, evidenceFile: 'intro-asr.json', evidenceSha256: sha256(evidenceBytes) };
  return { current, identity, evidenceBytes, verification, record: { text: current.groups[0].text, model: current.model, voice: current.voice, audioSha256: sha256(audio), selection: 'retained-identical-approved-intro', introContract: introCacheMetadata(identity, sha256(audio)) } };
}

describe('RE0 intro prevention', () => {
  it('loads the real repository contract and rejects the old Chinese intro', async () => {
    const actualPolicy = await loadIntroContract();
    expect(() => validateIntroPlan(plan(), actualPolicy)).not.toThrow();
    const legacy = plan();
    legacy.groups[0].text = '从零开始，帝国篇原住解说。';
    expect(() => validateIntroPlan(legacy, actualPolicy)).toThrow(/Chinese title expansion/);
  });
  it('rejects the delivered regression even when the subtitle still says Re:0', () => {
    const current = plan();
    current.groups[0].text = '从零开始，帝国篇原住解说。';
    expect(() => validateIntroPlan(current, policy, { groups: [{ id: 'intro', displayText: policy.displayText, speechText: current.groups[0].text }] })).toThrow(/Chinese title expansion/);
  });
  it('rejects a hidden whole-intro rewrite in voice direction', () => {
    const current = plan();
    expect(() => validateIntroPlan(current, policy, { groups: [{ id: 'intro', displayText: policy.displayText, speechText: current.groups[0].text }], pronunciationOverrides: [{ scope: 'intro', display: policy.displayText, speech: '从零开始，帝国篇原住解说。' }] })).toThrow(/override expands/);
  });
  it('rejects an unscoped brand rewrite but allows a body-only title reference', () => {
    const current = plan();
    const groups = [{ id: 'intro', displayText: policy.displayText, speechText: current.groups[0].text }];
    const rewrite = { text: 'Re:0', spoken: '从零开始' };
    expect(() => validateIntroPlan(current, policy, { groups, pronunciationOverrides: [rewrite] })).toThrow(/override expands/);
    expect(() => validateIntroPlan(current, policy, { groups, pronunciationOverrides: [{ ...rewrite, scope: 'body' }] })).not.toThrow();
  });
  it('also checks a global rewrite of the actual phonetic brand alias', () => {
    const current = plan();
    current.groups[0].text = 'R E 零，帝国篇原住解说。';
    expect(() => validateIntroPlan(current, policy, { groups: [{ id: 'intro', displayText: policy.displayText, speechText: current.groups[0].text }], pronunciationOverrides: [{ display: 'R E 零', speech: '从零开始' }] })).toThrow(/override expands/);
  });
  it.each(['speech', 'model', 'voice'] as const)('rejects a legal plan with a mismatching actual request %s', kind => {
    const actual = structuredClone(request);
    if (kind === 'speech') actual.body.messages[0].content = '从零开始，帝国篇原住解说。';
    if (kind === 'model') actual.body.model = 'another model';
    if (kind === 'voice') actual.body.audio.voice = 'another voice';
    expect(() => validateIntroPlan(plan(), policy, undefined, actual)).toThrow(/Actual synthesis request/);
  });
  it('does not let a retained selection flag authorize an old voice-only cache', () => {
    const { identity, record } = fixture();
    const { introContract: _metadata, ...legacy } = record;
    expect(() => validateIntroCache(identity, legacy, audio)).toThrow(/introContract/);
  });
  it('compares cache text against the current request, not an old record', () => {
    const { identity, record } = fixture();
    expect(() => validateIntroCache(identity, { ...record, text: '从零开始，帝国篇原住解说。' }, audio)).toThrow(/CURRENT request/);
  });
  it.each(['voice', 'model', 'options', 'policy', 'request'] as const)('invalidates the cache when %s changes', kind => {
    const { current, record, verification, evidenceBytes } = fixture();
    let changedPolicy = policy;
    const changedRequest = structuredClone(request);
    if (kind === 'voice') { current.voice = 'another voice'; changedRequest.body.audio.voice = current.voice; }
    if (kind === 'model') { current.model = 'another model'; changedRequest.body.model = current.model; }
    if (kind === 'options') Object.assign(current, { speed: 1.1, outputFormat: 'mp3' });
    if (kind === 'policy') changedPolicy = { ...policy, version: 'literal-re0-v2' };
    if (kind === 'request') changedRequest.body.audio.format = 'mp3';
    const identity = validateIntroPlan(current, changedPolicy, undefined, changedRequest);
    expect(() => validateIntroCache(identity, record, audio, verification, evidenceBytes)).toThrow(kind === 'voice' || kind === 'model' ? /CURRENT request/ : /policy or synthesis parameters/);
  });
  it('rejects different audio bytes even if every text and parameter matches', () => {
    const { identity, record } = fixture();
    expect(() => validateIntroCache(identity, record, Buffer.from('other audio'))).toThrow(/audio bytes/);
  });
  it('accepts the correct current request and its bound cache', () => {
    const { identity, record, verification, evidenceBytes } = fixture();
    expect(() => validateIntroCache(identity, record, audio, verification, evidenceBytes)).not.toThrow();
  });
  it('does not equate matching TTS text and voice approval with content verification', () => {
    const { identity, record } = fixture();
    expect(() => validateIntroCache(identity, record, audio)).toThrow(/Independent intro content verification/);
  });
  it('rejects old evidence, missing checks and modified evidence bytes', () => {
    const { identity, record, verification, evidenceBytes } = fixture();
    expect(() => validateIntroCache(identity, record, audio, { ...verification, policySha256: 'old-policy' }, evidenceBytes)).toThrow(/another audio or policy/);
    expect(() => validateIntroCache(identity, record, audio, { ...verification, literalBrandVerified: false }, evidenceBytes)).toThrow(/explicitly check/);
    expect(() => validateIntroCache(identity, record, audio, verification, Buffer.from('{}'))).toThrow(/evidence bytes/);
  });
  it('reads raw recognizedText rather than the expected script', () => {
    const { identity, record, verification } = fixture();
    const evidenceBytes = Buffer.from(JSON.stringify({ sha256: sha256(audio), recognizedText: '从零开始帝国篇原著解说', expectedSpeechText: identity.speechText }));
    expect(() => validateIntroCache(identity, record, audio, { ...verification, evidenceSha256: sha256(evidenceBytes) }, evidenceBytes)).toThrow(/Raw ASR does not independently verify/);
  });
  it('requires real listening evidence instead of generating a listening claim', () => {
    const { identity, record, verification } = fixture();
    const bytes = Buffer.from(JSON.stringify({ sha256: sha256(audio), actualListening: false, literalBrandVerified: true, yuanZhuVerified: true }));
    expect(() => validateIntroCache(identity, record, audio, { ...verification, method: 'listening', evidenceSha256: sha256(bytes) }, bytes)).toThrow(/actual listening/);
  });
  it('rejects a transcribed-looking expectation without a raw source result', () => {
    const { identity, record, verification } = fixture();
    const bytes = Buffer.from(JSON.stringify({ sha256: sha256(audio), recognizedText: 'RE0帝国篇原著解说', expectedSpeechText: identity.speechText }));
    expect(() => validateIntroCache(identity, record, audio, { ...verification, evidenceSha256: sha256(bytes) }, bytes)).toThrow(/Raw ASR source result/);
  });
  it('ignores unrelated body text but retains all intro-specific controls', () => {
    const current = plan();
    const original = validateIntroPlan(current, policy);
    current.groups[1].text = '不同正文。';
    expect(validateIntroPlan(current, policy)).toEqual(original);
    Object.assign(current.groups[0], { style: { rate: 0.9 } });
    expect(validateIntroPlan(current, policy)).not.toEqual(original);
  });
});
