import assert from 'node:assert/strict';
import test from 'node:test';
import { withSupportFaceCount } from '../../src/lib/supportTechnicalFacts.ts';

test('derives card face count from active support face records', () => {
  const technical = withSupportFaceCount({ measures: '4 x 2 m' }, [
    { active: true },
    { active: true },
    { active: false },
  ]);
  assert.deepEqual(technical, { measures: '4 x 2 m', caras: 2 });
});

test('preserves legacy technical face count when no face records exist', () => {
  const technical = withSupportFaceCount({ measures: '4 x 2 m', caras: 3 }, []);
  assert.deepEqual(technical, { measures: '4 x 2 m', caras: 3 });
});

test('returns null when neither technical data nor active faces exist', () => {
  assert.equal(withSupportFaceCount(null, [{ active: false }]), null);
});
