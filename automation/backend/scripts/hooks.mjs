// Module loader hook: the backend's four doors to the outside world (e-mail, AI, place and
// route lookup) are answered by the stubs in ../stubs instead. Nothing else is replaced.
const STUBBED = /\/backend\/src\/utils\/(mailer|gemini|geocode|routing)\.js$/;

export async function resolve(specifier, context, nextResolve) {
    const resolved = await nextResolve(specifier, context);
    const match = STUBBED.exec(resolved.url);
    if (!match) {
        return resolved;
    }
    return { ...resolved, url: new URL(`../stubs/${match[1]}.js`, import.meta.url).href };
}
