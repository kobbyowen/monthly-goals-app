import * as sprintService from '@services/sprintService.js';
import * as taskService from '@services/taskService.js';
import auth from '@lib/auth.js';
import { NextResponse } from 'next/server';

// Types that exactly match the incoming JSON payload
interface InputTask {
    id: string;
    name: string;
    effortType: string; // 'weekly' | 'monthly'
    allocatedHours: number;
    priority: string;
}

interface InputSprint {
    id: string;
    name: string;
    startAt: string; // ISO date (YYYY-MM-DD or full)
    endAt: string;
    tasks: InputTask[];
}

interface InputEpicPayload {
    epicId: string;
    epicName: string;
    epicMonth: string; // 'YYYY-MM'
    sprints: InputSprint[];
}

function getTokenFromHeaders(req: Request) {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/sessionToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

function toPlannedTimeFromHours(v: number | string | undefined | null) {
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    if (Number.isNaN(n)) return undefined;
    return Math.round(n * 3600);
}

function mapSprintInput(sn: InputSprint, _idx: number) {
    // map to the keys the repository expects (it will convert `start`/`end`)
    return {
        id: sn.id,
        name: sn.name,
        start: sn.startAt,
        end: sn.endAt,
    };
}

function mapTaskInput(t: InputTask) {
    return {
        id: t.id,
        name: t.name,
        plannedTime: toPlannedTimeFromHours(t.allocatedHours),
        category: t.priority,
    };
}

export async function POST(req: Request) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = (await req.json()) as InputEpicPayload;

        // parse epicMonth 'YYYY-MM'
        const parts = body.epicMonth.split('-');
        const year = Number(parts[0]);
        const month = Number(parts[1]);

        const epicPayload: any = {
            id: body.epicId,
            name: body.epicName,
            kind: 'epic',
            userId: user.id,
            epicYear: year,
            epicMonth: month,
        };

        const sprintsInput = body.sprints;
        epicPayload.sprints = sprintsInput.map(mapSprintInput);

        // create epic + child sprints
        const created = await sprintService.createSprint(epicPayload);

        // If input sprints had tasks, create them in order for each created child sprint
        try {
            if (Array.isArray(sprintsInput) && Array.isArray((created && created.sprints) || [])) {
                for (let i = 0; i < (created.sprints || []).length; i++) {
                    const child = created.sprints[i];
                    const input = sprintsInput[i] as InputSprint;
                    const tasks = input.tasks;
                    for (const taskIn of tasks) {
                        const mapped = mapTaskInput(taskIn);
                        try {
                            await taskService.createTask(child.id, mapped, user.id);
                        } catch (e) {
                            console.error('create child task failed', e);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('creating child tasks failed', e);
        }

        // return full epic (with children, tasks, sessions, metrics)
        const full = await sprintService.getSprint(created.id, user.id);
        return NextResponse.json(full || created, { status: 201 });
    } catch (err) {
        console.error('POST /goals/epic error', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
