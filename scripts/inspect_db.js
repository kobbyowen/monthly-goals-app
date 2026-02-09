const prisma = require("../app/lib/prisma.js");
(async () => {
  try {
    const sprints = await prisma.sprint.findMany({
      include: { tasks: { include: { sessions: true } } },
    });
    console.log("sprints:", JSON.stringify(sprints, null, 2));
    const tasks = await prisma.task.findMany({ include: { sessions: true } });
    console.log("tasks:", JSON.stringify(tasks, null, 2));
    const sessions = await prisma.session.findMany();
    console.log("sessions:", JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
