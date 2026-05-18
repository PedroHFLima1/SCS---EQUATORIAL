import { NextResponse } from 'next/server';
import { getUsers } from '@/app/actions/users';

export async function GET() {
  try {
    const result = await getUsers();
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
