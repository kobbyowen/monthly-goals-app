import { NextResponse } from 'next/server';

const checklistService = require('../../../../services/checklistService.js');
const { getParamFromUrl } = require('../../../../lib/routeUtils.js');

export async function GET(_req: Request, ctx: any) {
    try {
        const p = await ctx.params;
        const taskId = p?.id || getParamFromUrl(_req, 'tasks');
        const items = await checklistService.getChecklistsForTask(taskId);
        return NextResponse.json(items);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(req: Request, ctx: any) {
    try {
        const body = await req.json();
        const p = await ctx.params;
        const taskId = p?.id || getParamFromUrl(req, 'tasks');
        const created = await checklistService.createChecklist(taskId, body);
        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}
