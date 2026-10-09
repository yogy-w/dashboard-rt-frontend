const APPS_SCRIPT_RT_URL =
  'https://script.google.com/macros/s/AKfycbzUo7SGyd3Jk6AFyOb0NbY9VO5LdVY_QmG_QSD0-JjLBTycrHgZgbALHyjiNMoiT6KU/exec';

export async function GET(request: Request) {
  try {
    const incoming = new URL(request.url);
    const params = new URLSearchParams();

    incoming.searchParams.forEach((value, key) => {
      params.set(key, value);
    });

    const response = await fetch(
      `${APPS_SCRIPT_RT_URL}?${params.toString()}`,
      {
        cache: 'no-store',
        redirect: 'follow',
      }
    );

    if (!response.ok) {
      throw new Error(`Apps Script RT error: ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Gagal mengambil data RT',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(APPS_SCRIPT_RT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Apps Script RT error: ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Gagal menyimpan pemasukan',
      },
      { status: 500 }
    );
  }
}
