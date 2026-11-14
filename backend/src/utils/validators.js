// Checks that run on what users and admins type. No regular expression with
// repeated groups that overlap (they can take minutes on a crafted string,
// "ReDoS"): the checks below take time in proportion to the length.

const MAX_EMAIL_LENGTH = 254;

// "name@domain.tld": one "@", something on both sides, a dot inside the domain,
// no spaces.
export const isEmail = (value) => {
    if (typeof value !== "string" || value.length > MAX_EMAIL_LENGTH || /\s/.test(value)) {
        return false;
    }
    const at = value.indexOf("@");
    if (at < 1 || at !== value.lastIndexOf("@")) {
        return false;
    }
    const domain = value.slice(at + 1);
    const dot = domain.lastIndexOf(".");
    return dot > 0 && dot < domain.length - 1;
};
