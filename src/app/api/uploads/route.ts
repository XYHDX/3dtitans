import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function mapUpload(upload: any) {
  return {
    id: upload.id,
    modelName: upload.modelName,
    fileName: upload.fileName,
    filePath: upload.blobPath || '',
    fileUrl: upload.fileUrl,
    downloadURL: upload.downloadURL,
    notes: upload.notes || '',
    userId: upload.userId,
    userEmail: upload.userEmail || '',
    userDisplayName: upload.userDisplayName || '',
    phoneNumber: upload.phoneNumber,
    createdAt: upload.createdAt,
    assignedOwnerId: upload.assignedOwnerId || null,
    status: upload.status,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'store-owner')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uploads = await prisma.upload.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ uploads: uploads.map(mapUpload) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { modelName, fileName, fileUrl, downloadURL, notes, phoneNumber } = body;

  if (!modelName || !fileName || !downloadURL) {
    return NextResponse.json({ error: 'Model name, file name, and downloadURL are required' }, { status: 400 });
  }

  const upload = await prisma.upload.create({
    data: {
      modelName,
      fileName,
      fileUrl: fileUrl || downloadURL,
      downloadURL,
      notes: notes || '',
      phoneNumber: phoneNumber || '',
      userId: user.id,
      userEmail: user.email || '',
      userDisplayName: user.name || user.email || 'User',
      status: 'new',
    },
  });

  return NextResponse.json({ upload: mapUpload(upload) });
}
