import { NextRequest, NextResponse } from 'next/server';
import { 
  createUser, 
  updateUser, 
  deleteUser, 
  toggleUserStatus, 
  resetUserPassword 
} from '@/app/actions/users';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    
    let result;
    switch (action) {
      case 'createUser':
        result = await createUser(payload);
        break;
      case 'updateUser':
        result = await updateUser(payload.id, payload.data);
        break;
      case 'deleteUser':
        result = await deleteUser(payload.id);
        break;
      case 'toggleUserStatus':
        result = await toggleUserStatus(payload.id, payload.status);
        break;
      case 'resetUserPassword':
        result = await resetUserPassword(payload.id);
        break;
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
