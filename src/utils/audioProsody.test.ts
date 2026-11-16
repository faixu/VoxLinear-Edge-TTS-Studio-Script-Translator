import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_VOICES,
  formatEdgeRate,
  formatEdgePitch,
  clampPauseDuration,
  splitScriptIntoParagraphs,
  createMp3SilenceBuffer,
  estimateAudioDurationSeconds,
} from './audioProsody';

test('CURATED_VOICES includes all 8 Indian voices and 8 Global voices', () => {
  const indianVoices = CURATED_VOICES.filter((v) => v.tab === 'indian');
  const globalVoices = CURATED_VOICES.filter((v) => v.tab === 'global');

  assert.equal(indianVoices.length, 8);
  assert.equal(globalVoices.length, 8);
  assert.ok(indianVoices.some((v) => v.id === 'hi-IN-MadhurNeural'));
  assert.ok(indianVoices.some((v) => v.id === 'en-IN-PrabhatNeural'));
  assert.ok(globalVoices.some((v) => v.id === 'en-US-BrianNeural'));
  assert.ok(globalVoices.some((v) => v.id === 'en-GB-RyanNeural'));
});

test('formatEdgeRate and formatEdgePitch format prosody values accurately', () => {
  assert.equal(formatEdgeRate(-6), '-6%');
  assert.equal(formatEdgeRate(0), '+0%');
  assert.equal(formatEdgeRate(15), '+15%');
  assert.equal(formatEdgeRate(-40), '-25%');

  assert.equal(formatEdgePitch(-3), '-3Hz');
  assert.equal(formatEdgePitch(0), '+0Hz');
  assert.equal(formatEdgePitch(8), '+8Hz');
  assert.equal(formatEdgePitch(25), '+10Hz');
});

test('splitScriptIntoParagraphs preserves dramatic punctuation and filters empty lines', () => {
  const raw = 'First paragraph with suspense....\r\n\r\n   \r\nSecond paragraph... wait for it.';
  const chunks = splitScriptIntoParagraphs(raw);
  assert.deepEqual(chunks, [
    'First paragraph with suspense...',
    'Second paragraph... wait for it.',
  ]);
});

test('createMp3SilenceBuffer produces exact 144-byte CBR MP3 frames (24ms per frame)', () => {
  const buf = createMp3SilenceBuffer(1.5);
  // 1500ms / 24ms = 62.5 -> 63 frames * 144 bytes = 9072 bytes
  assert.equal(buf.byteLength, 63 * 144);
  assert.equal(buf[0], 0xff);
  assert.equal(buf[1], 0xf3);
  assert.equal(buf[2], 0x84);
  assert.equal(buf[3], 0xc4);
});

test('clampPauseDuration and estimateAudioDurationSeconds compute valid numbers', () => {
  assert.equal(clampPauseDuration(1.5), 1.5);
  assert.equal(clampPauseDuration(0.1), 0.5);
  assert.equal(clampPauseDuration(9.0), 3.0);

  const est = estimateAudioDurationSeconds('One two three four five.\n\nSix seven eight nine ten.', -6, 1.5);
  assert.ok(est > 3);
});
