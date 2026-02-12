import sprintService from '@services/sprintService.js';
import auth from '@lib/auth.js';
import { NextResponse } from 'next/server';

// Reuse existing sprint service for epic APIs (epic == sprint in storage)



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
        // Only return rows representing epics
        const results = await sprintService.listSprints(user.id, 'epic');
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
        const created = await sprintService.createSprint({ ...body, userId: user.id });
        // Always return the full epic shape (including child sprints, tasks, sessions, metrics)
        const full = await sprintService.getSprint(created.id, user.id);
        return NextResponse.json(full || created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
