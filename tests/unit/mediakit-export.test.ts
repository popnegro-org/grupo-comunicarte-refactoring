import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaKitPdf, createMediaKitPpt } from '../../src/lib/adminMediaKitExport.ts';

const lead = {
  name: 'Cliente de prueba',
  email: 'qa@example.test',
  company: 'Marca de prueba',
  phone: '2610000000',
  proposalPeriod: '4 semanas',
  proposalAmount: 'ARS 1.200.000',
};
const supports = [
  { canonical_id: 'qa-1', name: 'Cartel Centro', ciudad: 'Mendoza', tipo_soporte: 'Cartel tradicional', address: 'Av. San Martín' },
  { canonical_id: 'qa-2', name: 'Pantalla LED', ciudad: 'Mendoza', tipo_soporte: 'Pantalla LED' },
  { canonical_id: 'qa-3', name: 'LED móvil', ciudad: 'Godoy Cruz', tipo_soporte: 'LED móvil' },
];

test('PDF export follows the six-page 16:9 canonical Media Kit structure', async () => {
  const blob = await createMediaKitPdf(lead, supports, 'QA-001');
  const bytes = Buffer.from(await blob.arrayBuffer());
  const source = bytes.toString('latin1');
  assert.equal(blob.type, 'application/pdf');
  assert.ok(bytes.length > 1000);
  assert.ok(source.startsWith('%PDF-1.4'));
  assert.equal(source.split('/Type /Page ').length - 1, 6);
  assert.equal(source.split('/MediaBox [0 0 960 540]').length - 1, 6);
  assert.match(source, /Tu marca/);
  assert.match(source, /RESUMEN COMERCIAL/);
  assert.ok(source.includes('PR'));
  assert.match(source, /startxref/);
  assert.match(source, / c\n/); // rounded card paths used by the canonical template
  assert.ok(source.includes('0.867 0.886 0.910 rg')); // subtle card shadow layer
});

test('PPTX export is a valid 16:9 six-slide presentation using the canonical content sequence', async () => {
  const blob = await createMediaKitPpt(lead, supports, 'QA-001');
  const bytes = Buffer.from(await blob.arrayBuffer());
  const source = bytes.toString('latin1');
  assert.equal(blob.type, 'application/zip');
  assert.ok(bytes.length > 1000);
  assert.equal(Array.from({ length: 6 }, (_, i) => source.includes('ppt/slides/slide' + (i + 1) + '.xml')).filter(Boolean).length, 6);
  assert.ok(source.includes('ppt/slides/slide1.xml'));
  assert.ok(source.includes('ppt/slides/slide6.xml'));
  assert.match(source, /12192000/);
  assert.match(source, /6858000/);
  assert.ok(source.includes('Aptos'));
  assert.ok(source.includes('roundRect')); // rounded native PPTX geometry
});

test('exports a quote-required fallback when no global investment amount was agreed', async () => {
  const leadWithoutAmount = { ...lead, proposalAmount: '' };
  const pdf = await createMediaKitPdf(leadWithoutAmount, supports, 'QA-002');
  const source = Buffer.from(await pdf.arrayBuffer()).toString('latin1');
  assert.ok(source.includes('sujeta a'));
  assert.ok(!source.includes('99999'));
});
