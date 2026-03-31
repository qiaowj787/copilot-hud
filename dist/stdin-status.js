function asRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function asString(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
function asNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function summarizeRateLimits(rateLimits) {
    const value = asRecord(rateLimits);
    if (!value) {
        return undefined;
    }
    const summaries = [];
    for (const [key, rawEntry] of Object.entries(value)) {
        const entry = asRecord(rawEntry);
        if (!entry) {
            continue;
        }
        const used = asNumber(entry.used) ?? asNumber(entry.consumed);
        const limit = asNumber(entry.limit) ?? asNumber(entry.max);
        const remaining = asNumber(entry.remaining);
        if (used !== undefined && limit !== undefined && limit > 0) {
            summaries.push(`${key} ${Math.round((used / limit) * 100)}%`);
            continue;
        }
        if (remaining !== undefined && limit !== undefined && limit > 0) {
            summaries.push(`${key} ${Math.round(((limit - remaining) / limit) * 100)}%`);
        }
    }
    return summaries.length ? summaries.join(' | ') : undefined;
}
function parseContextWindow(root) {
    const contextWindow = asRecord(root.context_window) ?? asRecord(root.contextWindow);
    if (!contextWindow) {
        return undefined;
    }
    const currentUsage = asRecord(contextWindow.current_usage) ?? asRecord(contextWindow.currentUsage);
    const currentInputTokens = asNumber(currentUsage?.input_tokens) ?? asNumber(currentUsage?.inputTokens);
    const maximumInputTokens = asNumber(contextWindow.context_window_size) ?? asNumber(contextWindow.contextWindowSize);
    if (currentInputTokens === undefined && maximumInputTokens === undefined) {
        return undefined;
    }
    return { currentInputTokens, maximumInputTokens };
}
export async function readStatusLineInput() {
    if (process.stdin.isTTY) {
        return undefined;
    }
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) {
        return undefined;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return undefined;
    }
    const context = asRecord(parsed.context);
    const model = asRecord(parsed.model);
    const session = asRecord(parsed.session);
    return {
        sessionId: asString(parsed.sessionId) ?? asString(session?.id),
        cwd: asString(parsed.cwd) ?? asString(context?.cwd) ?? asString(session?.cwd),
        gitBranch: asString(parsed.branch) ?? asString(context?.branch),
        modelName: asString(parsed.currentModel) ?? asString(model?.display_name) ?? asString(model?.displayName) ?? asString(model?.name),
        mode: asString(parsed.mode) ?? asString(session?.mode),
        summary: asString(parsed.summary) ?? asString(session?.summary),
        contextWindow: parseContextWindow(parsed),
        rateSummary: summarizeRateLimits(parsed.rate_limits ?? parsed.rateLimits)
    };
}
