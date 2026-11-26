// The model sometimes wraps its JSON in text / code fences: keep the outer { ... } and parse it.
// Returns the object, or undefined when there is none or it is not valid JSON.
const parseJsonObject = (text) => {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}") + 1;
    if (start === -1 || end === 0) {
        return undefined;
    }
    try {
        return JSON.parse(text.substring(start, end));
    } catch {
        return undefined;
    }
};

export default parseJsonObject;
