import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useSelection } from '../../context/SelectionContext';
import { Input, Textarea, Label } from '../ui/Input';
import { Button } from '../ui/Button';
import { apiFetch } from '../../lib/api';

export function ContactForm({ isMediaKit = false }: { isMediaKit?: boolean }) {
  const [searchParams] = useSearchParams();
  const { selectedIds, selectedCount, restoreSelection, clearSelection } = useSelection();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestId, setRequestId] = useState('');
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    if (!isMediaKit || selectedCount > 0) return;
    const rawIds = searchParams.get('soportes');
    if (!rawIds) return;
    const ids = rawIds.split(',').map(id => decodeURIComponent(id).trim()).filter(Boolean);
    if (ids.length) restoreSelection(ids);
  }, [isMediaKit, selectedCount, searchParams, restoreSelection]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const selectedSupportIds = Array.from(selectedIds).sort();

    if (normalizedName.length < 2 || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Completá tu nombre y un email válido.');
      return;
    }

    if (isMediaKit && selectedSupportIds.length === 0) {
      setError('Seleccioná al menos un soporte antes de solicitar el Media Kit.');
      return;
    }

    const payloadFingerprint = JSON.stringify({ name: normalizedName, email: normalizedEmail, company: company.trim(), phone: phone.trim(), message: message.trim(), selectedSupportIds });
    if (!idempotencyRef.current || idempotencyRef.current.fingerprint !== payloadFingerprint) {
      idempotencyRef.current = { fingerprint: payloadFingerprint, key: crypto.randomUUID() };
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/mediakit/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            name: normalizedName,
            company: company.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            message: message.trim(),
          },
          selectedIds: selectedSupportIds,
          idempotencyKey: idempotencyRef.current.key,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.status === 'error' || data?.status === 'availability_conflict') {
        throw new Error(data?.message || 'No pudimos enviar tu solicitud. Intentá nuevamente.');
      }

      const newRequestId = data?.requestId || `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
      setRequestId(newRequestId);
      setSuccess(isMediaKit ? 'Solicitud de Media Kit recibida.' : 'Recibimos tu consulta.');
      if (isMediaKit) clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu solicitud. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 md:p-8">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold text-gray-950">Solicitud enviada</h2>
        <p className="mt-2 text-sm text-gray-600">{success}</p>
        {isMediaKit && requestId && <p className="mt-3 text-sm font-semibold text-gray-800">Solicitud {requestId}</p>}
        {isMediaKit && <p className="mt-1 text-xs text-gray-500">El equipo comercial recibió tu selección y preparará el Media Kit.</p>}
        <Link to="/inventario" className="mt-5 inline-flex items-center rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">Volver al inventario</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 md:p-8 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">{isMediaKit ? 'Media Kit' : 'Contacto'}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{isMediaKit ? 'Solicitá tu Media Kit' : 'Contanos qué necesitás'}</h2>
        {isMediaKit && <p className="mt-2 text-sm text-gray-500">{selectedCount} {selectedCount === 1 ? 'soporte seleccionado' : 'soportes seleccionados'}.</p>}
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="contact-name">Nombre completo *</Label><Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Tu nombre y apellido" /></div>
        <div><Label htmlFor="contact-company">Empresa</Label><Input id="contact-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Empresa o agencia" /></div>
        <div><Label htmlFor="contact-email">Email *</Label><Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nombre@empresa.com" /></div>
        <div><Label htmlFor="contact-phone">Teléfono</Label><Input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 ..." /></div>
      </div>

      <div><Label htmlFor="contact-message">Mensaje</Label><Textarea id="contact-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={isMediaKit ? "Opcional: fechas, campaña, objetivos o comentarios." : "Contanos brevemente qué necesitás."} /></div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto min-w-48">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Enviando…' : isMediaKit ? 'Enviar solicitud de Media Kit' : 'Enviar consulta'}
      </Button>
    </form>
  );
}
