import * as sprintService from '@services/sprintService.js';
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
        // Only return rows representing child sprints (not epics)
        const results = await sprintService.listSprints(user.id, 'sprint');
        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await req.json();
        // Mark these rows as real sprints; epics are created via /api/epics
        const created = await sprintService.createSprint({
            ...body,
            kind: 'sprint',
            userId: user.id,
        });
        // Return the full sprint with tasks, sessions, and checklists
        const full = await sprintService.getSprint(created.id, user.id);
        return NextResponse.json(full || created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
