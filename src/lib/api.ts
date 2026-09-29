const base = '/api/sheet';

export async function getKas() {
  const r = await fetch(`${base}?action=kas`, {
    cache: 'no-store',
  });

  if (!r.ok) {
    throw new Error(await r.text());
  }

  return r.json();
}

export async function getJimpitan() {
  const r = await fetch(`${base}?action=jimpitan`, {
    cache: 'no-store',
  });

  if (!r.ok) {
    throw new Error(await r.text());
  }

  return r.json();
}