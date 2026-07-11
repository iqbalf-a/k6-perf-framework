import encoding from 'k6/encoding';

export function basicAuth(username, password) {
    return encoding.b64encode(`${username}:${password}`);
}
