"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// get object member count
function count(o) {
    let t = typeof o;
    if (t == 'string') {
        return o.length;
    }
    else if (t == 'object') {
        let n = 0;
        for (let _ in o) {
            n++;
        }
        return n;
    }
    return 0;
}
exports.count = count;
function compareStr(a, b) {
    if (a.length != b.length)
        return a.length > b.length ? 1 : -1;
    if (a == b)
        return 0;
    for (let i = Math.min(a.length, b.length) - 1; i > -1; --i) {
        const aa = a.charCodeAt(i);
        const bb = b.charCodeAt(i);
        if (aa != bb)
            return aa - bb;
    }
    return 0;
}
exports.compareStr = compareStr;
//# sourceMappingURL=comm_utils.js.map