import { getParamFromUrl } from '@lib/routeUtils.js';
import sessionService from '@services/sessionService.js';
import { NextResponse } from 'next/server';



export async function GET(_req: Request, ctx: any) {
    try {
        const p = await ctx.params;
        const taskId = p?.id || getParamFromUrl(_req, 'tasks');
        const sessions = await sessionService.listSessionsForTask(taskId);
        return NextResponse.json(sessions);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(req: Request, ctx: any) {
    try {
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const p = await ctx.params;
        const taskId = p?.id || getParamFromUrl(req, 'tasks');
        const created = await sessionService.createSession(taskId, body);
        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
