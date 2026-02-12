import { getParamFromUrl } from '@lib/routeUtils.js';
import taskService from '@services/taskService.js';
import { NextResponse } from 'next/server';



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
        await taskService.updateTask(id, body);
        // Always return the full task, including sessions and checklists
        const full = await taskService.getTask(id);
        return NextResponse.json(full);
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
