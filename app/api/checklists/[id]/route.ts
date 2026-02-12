import { getParamFromUrl } from '@lib/routeUtils.js';
import checklistService from '@services/checklistService.js';
import { NextResponse } from 'next/server';



export async function PATCH(req: Request, ctx: any) {
    try {
        const body = await req.json();
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, 'checklists');
        const updated = await checklistService.updateChecklist(id, body);
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}

export async function DELETE(_req: Request, ctx: any) {
    try {
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(_req, 'checklists');
        await checklistService.deleteChecklist(id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
