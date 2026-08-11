import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-utils';
import { getVideoJob } from '../../../../server/lib/videoJobs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const { jobId } = await params;
    
    const job = getVideoJob(jobId);
    if (!job) {
      return NextResponse.json({ message: 'Nie znaleziono zadania generowania wideo' }, { status: 404 });
    }
    
    if (job.userId !== user.id) {
      return NextResponse.json({ message: 'Brak dostępu do tego zadania' }, { status: 403 });
    }
    
    return NextResponse.json(job);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ message }, { status: 401 });
  }
}
