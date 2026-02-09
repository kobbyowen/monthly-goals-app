import { NextResponse } from 'next/server';

const sessionService = require('../../../services/sessionService.js');
const { getParamFromUrl } = require('../../../lib/routeUtils.js');

export async function PATCH(req: Request, ctx: any) {
    try {
        const body = await req.json();
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, 'sessions');
        const updated = await sessionService.updateSession(id, body);
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(_req: Request, ctx: any) {
    try {
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(_req, 'sessions');
        await sessionService.deleteSession(id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
