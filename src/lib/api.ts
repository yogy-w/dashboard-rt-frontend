const base =
  'https://script.google.com/macros/s/AKfycbz5VGhQacnOjGLfgcJQuCfN5eTqzjkOUaSR9s93JJWqOdeqJrpBozsgv6P0nnByPdhgdg/exec';

async function request(action: 'kas' | 'jimpitan') {
  const r = await fetch(`${base}?action=${action}`, {
    cache: 'no-store',
  });

  if (!r.ok) {
    throw new Error(await r.text());
  }

  const data = await r.json();

  if (!data.success) {
    throw new Error(data.message || 'Gagal mengambil data');
  }

  return data;
}

export function getKas() {
  return request('kas');
}

export function getJimpitan() {
  return request('jimpitan');
}