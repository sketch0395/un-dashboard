import { NextResponse } from 'next/server';
import { AuthService } from '../../../../../middleware/auth';

export async function GET(request) {
  try {
    // Get token from cookies or authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'No authentication token found',
        authenticated: false
      }, { status: 401 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);

    return NextResponse.json({
      success: true,
      message: 'Authentication valid',
      authenticated: true,
      user: authData.user
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Authentication failed',
      authenticated: false
    }, { status: 401 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Token is required',
        authenticated: false
      }, { status: 400 });
    }

    // Create mock request object for AuthService
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    // Verify authentication
    const authData = await AuthService.verifyAuth(mockReq);

    return NextResponse.json({
      success: true,
      message: 'Token is valid',
      authenticated: true,
      user: authData.user
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Token verification failed',
      authenticated: false
    }, { status: 401 });
  }
}
