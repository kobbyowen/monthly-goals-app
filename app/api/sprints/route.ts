import { NextResponse } from 'next/server';

const sprintService = require('../../services/sprintService.js');
const { getParamFromUrl } = require('../../lib/routeUtils.js');
const auth = require('../../lib/auth.js');

function mapSprintRow(row: any) {
    return {
        id: row.id,
        name: row.name,
        dateExpectedToStart: row.dateExpectedToStart,
        dateExpectedToEnd: row.dateExpectedToEnd,
        dateStarted: row.dateStarted,
        dateEnded: row.dateEnded,
        status: row.status,
        plannedTime: row.plannedTime,
        actualTimeSpent: row.actualTimeSpent,
        tasks: [] as any[],
    };
}

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
        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
