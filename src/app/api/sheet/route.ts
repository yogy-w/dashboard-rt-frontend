const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbz5VGhQacnOjGLfgcJQuCfN5eTqzjkOUaSR9s93JJWqOdeqJrpBozsgv6P0nnByPdhgdg/exec';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'kas';

    if (action !== 'kas' && action !== 'jimpitan') {
      return Response.json(
        {
          success: false,
          message: 'Action tidak valid',
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=${action}`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Apps Script error: ${response.status}`);
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
            : 'Gagal mengambil data',
      },
      { status: 500 }
    );
  }
}