export function daysInMonth(year: number, month: number) {
    // month: 1-12
    return new Date(year, month, 0).getDate();
}

export function weeksInMonth(year: number, month: number) {
    // Special rule: treat February as 4 weeks (brush-up days are extra)
    if (month === 2) return 4;
    const days = daysInMonth(year, month);
    return Math.ceil(days / 7);
}
