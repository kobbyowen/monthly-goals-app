import { NextResponse } from 'next/server';

const taskService = require('../../../services/taskService.js');
const { getParamFromUrl } = require('../../../lib/routeUtils.js');

export async function GET(_req: Request, ctx: any) {
    try {
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(_req, 'tasks');
        const t = await taskService.getTask(id);
        if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(t);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function PATCH(req: Request, ctx: any) {
    try {
        const body = await req.json();
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, 'tasks');
        const updated = await taskService.updateTask(id, body);
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(_req: Request, ctx: any) {
    try {
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(_req, 'tasks');
        await taskService.deleteTask(id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
