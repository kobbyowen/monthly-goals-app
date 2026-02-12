import { getParamFromUrl } from '@lib/routeUtils.js';
import taskService from '@services/taskService.js';
import { NextResponse } from 'next/server';



export async function POST(req: Request, ctx: any) {
    try {
        const body = await req.json();
        if (!body.id || !body.name) return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
        if (typeof body.plannedTime !== 'number' || isNaN(body.plannedTime)) {
            return NextResponse.json({ error: 'Invalid or missing plannedTime' }, { status: 400 });
        }
        const p = await ctx.params;
        const sprintId = p?.id || getParamFromUrl(req, 'sprints');
        const created = await taskService.createTask(sprintId, body);
        // Return full task details (including sessions and checklists)
        const full = await taskService.getTask(created.id);
        return NextResponse.json(full || created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
