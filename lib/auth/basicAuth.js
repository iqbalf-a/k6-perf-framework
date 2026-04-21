import encoding from 'k6/encoding';

export function buildBasicAuthHeader(username, password) {
    return { Authorization: `Basic ${encoding.b64encode(`${username}:${password}`)}` };
}
