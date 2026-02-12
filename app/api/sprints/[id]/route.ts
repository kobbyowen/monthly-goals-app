import { NextResponse } from 'next/server';

const sprintService = require('../../../services/sprintService.js');
const { getParamFromUrl } = require('../../../lib/routeUtils.js');
const auth = require('../../../lib/auth.js');

function getTokenFromHeaders(req: Request) {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/sessionToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

export async function GET(req: Request, ctx: any) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, 'sprints');
        const sprint = await sprintService.getSprint(id, user.id);
        if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(sprint);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function PUT(req: Request, ctx: any) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await req.json();
        // Delegate to repo via service (upsert semantics); then reload full sprint
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, 'sprints');
        const updated = await sprintService.createSprint({ id, ...body, userId: user.id });
        const full = await sprintService.getSprint(id, user.id);
        return NextResponse.json(full || updated);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: Request, ctx: any) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, 'sprints');
        await sprintService.deleteSprint(id, user.id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
