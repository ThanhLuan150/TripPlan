// Builds the text filter of the post search. The keyword is never used as a raw regular
// expression: every special character is escaped (so "a.*" or "(" are plain text, no ReDoS,
// no injection) and letters match with or without Vietnamese accents ("ha giang" finds "Hà Giang").

export const MAX_SEARCH_LENGTH = 100;

const VARIANTS = {
    a: "aàáảãạăằắẳẵặâầấẩẫậ",
    d: "dđ",
    e: "eèéẻẽẹêềếểễệ",
    i: "iìíỉĩị",
    o: "oòóỏõọôồốổỗộơờớởỡợ",
    u: "uùúủũụưừứửữự",
    y: "yỳýỷỹỵ",
};

const escapeRegex = (char) => char.replace(/[.*+?^${}()|[\]\\\-/]/g, "\\$&");

const stripAccents = (value) =>
    value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

// Keyword from the query string -> { keyword } (trimmed, "" means no search) or { error }.
export const cleanKeyword = (value) => {
    if (value === undefined || value === null) {
        return { keyword: "" };
    }
    if (typeof value !== "string") {
        return { error: "q must be text" };
    }
    // control characters have no place in a search; runs of spaces count as one
    // eslint-disable-next-line no-control-regex
    const keyword = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    if (keyword.length > MAX_SEARCH_LENGTH) {
        return { error: `q must be at most ${MAX_SEARCH_LENGTH} characters` };
    }
    return { keyword };
};

// Case and accent insensitive regular expression source for the keyword.
export const keywordPattern = (keyword) =>
    [...stripAccents(keyword).toLowerCase()]
        .map((char) => {
            const variants = VARIANTS[char];
            return variants ? `[${variants}${variants.toUpperCase()}]` : escapeRegex(char);
        })
        .join("");
