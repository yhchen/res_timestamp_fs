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
//# sourceMappingURL=comm_utils.js.map