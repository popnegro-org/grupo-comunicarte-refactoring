import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
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


test('client PDF export never includes internal base pricing even if extra runtime fields are supplied', async () => {
  const supportsWithInternalPricing = supports.map((support) => ({
    ...support,
    pricing: {
      exhibition_price: 987654321,
      installation_price: 876543210,
      printing_price: 765432109,
      monthly_price: 654321098,
      exclusive_price: 543210987,
      currency: 'ARS',
    },
  }));
  const pdf = await createMediaKitPdf({ ...lead, proposalAmount: '' }, supportsWithInternalPricing, 'QA-PRIVACY');
  const content = Buffer.from(await pdf.arrayBuffer()).toString('latin1');
  for (const sentinel of ['987654321', '876543210', '765432109', '654321098', '543210987']) {
    assert.equal(content.includes(sentinel), false, 'internal base price leaked into PDF: ' + sentinel);
  }
});


function extractZipTextEntries(zip: Buffer, prefix: string): string[] {
  const output: string[] = [];
  for (let offset = 0; offset + 46 <= zip.length;) {
    const signature = zip.readUInt32LE(offset);
    if (signature !== 0x02014b50) {
      offset += 1;
      continue;
    }
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    if (name.startsWith(prefix)) {
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = zip.subarray(dataOffset, dataOffset + compressedSize);
      const content = method === 8 ? inflateRawSync(compressed) : compressed;
      output.push(content.toString('utf8'));
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return output;
}

test('client PPTX export never includes internal base pricing even if extra runtime fields are supplied', async () => {
  const supportsWithInternalPricing = supports.map((support) => ({
    ...support,
    pricing: {
      exhibition_price: 987654321,
      installation_price: 876543210,
      printing_price: 765432109,
      monthly_price: 654321098,
      exclusive_price: 543210987,
      currency: 'ARS',
    },
  }));
  const ppt = await createMediaKitPpt({ ...lead, proposalAmount: '' }, supportsWithInternalPricing, 'QA-PRIVACY');
  const entries = extractZipTextEntries(Buffer.from(await ppt.arrayBuffer()), 'ppt/slides/slide');
  assert.equal(entries.length, 6);
  const slides = entries.join('\n');
  for (const sentinel of ['987654321', '876543210', '765432109', '654321098', '543210987']) {
    assert.equal(slides.includes(sentinel), false, 'internal base price leaked into PPTX: ' + sentinel);
  }
});
