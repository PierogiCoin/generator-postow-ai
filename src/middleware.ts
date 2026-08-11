import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Only initialize if env vars are present
const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasUpstash 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Define ratelimiters
const ratelimiters = {
  general: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '900 s'), // 15 mins
    prefix: '@upstash/ratelimit/general',
  }) : null,
  expensive: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '3600 s'), // 60 mins
    prefix: '@upstash/ratelimit/expensive',
  }) : null,
  text: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '300 s'), // 5 mins
    prefix: '@upstash/ratelimit/text',
  }) : null,
};

export async function middleware(request: NextRequest) {
  // Pass through if Upstash is not configured (we rely on Vercel or other protections)
  if (!redis) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  
  // Determine which limiter to use
  let limiter = ratelimiters.general;
  if (path.startsWith('/api/generate-images') || path.startsWith('/api/generate-video')) {
    limiter = ratelimiters.expensive;
  } else if (path.startsWith('/api/generate-content')) {
    limiter = ratelimiters.text;
  }

  if (!limiter) {
    return NextResponse.next();
  }

  // Get user ID from Supabase auth header or fallback to IP
  // Next.js middleware doesn't easily decode Supabase JWT without the library,
  // so for rate limiting, IP is the safest fallback if auth header isn't parsed.
  // In a full implementation, we'd use @supabase/ssr here.
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  
  // For now, use IP for rate limiting
  const identifier = `ip:${ip}`;
  
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  
  if (!success) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
