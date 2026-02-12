import { getParamFromUrl } from '@lib/routeUtils.js';
import * as taskService from '@services/taskService.js';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(_req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
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

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
    try {
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(_req, 'tasks');
        await taskService.deleteTask(id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
