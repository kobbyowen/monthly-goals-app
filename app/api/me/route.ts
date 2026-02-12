import auth from '@lib/auth.js';
import { NextResponse } from 'next/server';


function getTokenFromHeaders(req: Request) {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/sessionToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

export async function GET(req: Request) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // Only return safe user fields
        const safe = { id: user.id, name: user.name, email: user.email };
        return NextResponse.json(safe);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
