const base=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api';
export async function getKas(){const r=await fetch(`${base}/kas`,{cache:'no-store'});if(!r.ok)throw new Error(await r.text());return r.json();}
export async function getKasDetail(){const r=await fetch(`${base}/kas/detail`,{cache:'no-store'});if(!r.ok)throw new Error(await r.text());return r.json();}
export async function getJimpitan(){const r=await fetch(`${base}/jimpitan`,{cache:'no-store'});if(!r.ok)throw new Error(await r.text());return r.json();}
