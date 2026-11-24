const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwPdgbi4D474e157IGAj6GtefoWwrB47vfs9w-pGnLLZlTL6nDEZUQQ7bPILo7K_Vwn8w/exec';

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