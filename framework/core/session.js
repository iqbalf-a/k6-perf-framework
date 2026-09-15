const sessions = {};

export function getSession() {
    if (!sessions[__VU]) sessions[__VU] = {};
    return sessions[__VU];
}

export function clearSession() {
    delete sessions[__VU];
}
