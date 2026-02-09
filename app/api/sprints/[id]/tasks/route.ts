import { NextResponse } from 'next/server';

const taskService = require('../../../../services/taskService.js');
const { getParamFromUrl } = require('../../../../lib/routeUtils.js');

export async function POST(req: Request, ctx: any) {
    try {
        const body = await req.json();
        if (!body.id || !body.name) return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
        const p = await ctx.params;
        const sprintId = p?.id || getParamFromUrl(req, 'sprints');
        const created = await taskService.createTask(sprintId, body);
        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
