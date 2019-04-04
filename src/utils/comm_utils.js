"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function count(o) {
    var t = typeof o;
    if (t == 'string') {
        return o.length;
    }
    else if (t == 'object') {
        var n = 0;
        for (var i in o) {
            n++;
        }
        return n;
    }
    return false;
}
exports.count = count;
//# sourceMappingURL=comm_utils.js.map