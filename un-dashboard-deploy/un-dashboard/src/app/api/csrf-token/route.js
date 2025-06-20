import { getCSRFTokenAPI } from '../../utils/csrfProtection';

export async function GET(request) {
  return getCSRFTokenAPI(request);
}

export async function POST() {
  return new Response(JSON.stringify({
    success: false,
    message: 'Method not allowed'
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
