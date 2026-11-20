import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProposalDuration, isProposalDurationValid, normalizeProposalDuration, proposalDurationFromOption, proposalDurationOption, toLegacyMediaKitState } from '../../src/lib/mediakitDuration.ts';

test('accepts only the four commercial duration modalities', () => {
  for (const [value, unit, label] of [['7', 'días', '7 días'], ['15', 'días', '15 días'], ['21', 'días', '21 días'], ['1', 'meses', 'Mensual']] as const) {
    const period = normalizeProposalDuration(value, unit);
    assert.equal(isProposalDurationValid(period), true);
    assert.equal(formatProposalDuration(period), label);
    assert.equal(proposalDurationOption(period), `${value}:${unit}`);
  }
});

test('does not silently reinterpret legacy or custom durations', () => {
  for (const [value, unit] of [['2', 'meses'], ['1', 'semanas'], ['indefinido', 'indefinido'], ['30', 'días']] as const) {
    const period = normalizeProposalDuration(value, unit);
    assert.equal(isProposalDurationValid(period), false);
    assert.equal(formatProposalDuration(period), '');
  }
});

test('parses only canonical duration selector values', () => {
  assert.deepEqual(proposalDurationFromOption('15:días'), { duracionValor: '15', duracionUnidad: 'días' });
  assert.deepEqual(proposalDurationFromOption('1:meses'), { duracionValor: '1', duracionUnidad: 'meses' });
  assert.equal(proposalDurationFromOption('otros:personalizada').duracionValor, '');
});


test('maps Media Kit lifecycle states to the legacy CRM state labels', () => {
  assert.equal(toLegacyMediaKitState('draft'), 'Borrador');
  assert.equal(toLegacyMediaKitState('ready'), 'Aceptado');
  assert.equal(toLegacyMediaKitState('sent'), 'Enviado');
  assert.equal(toLegacyMediaKitState('archived'), 'Archivado');
});
