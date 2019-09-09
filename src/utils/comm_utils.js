"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
class AsyncWorkMonitor {
    constructor() {
        this._leftCnt = 0;
    }
    addWork(cnt = 1) {
        this._leftCnt += cnt;
    }
    decWork(cnt = 1) {
        this._leftCnt -= cnt;
    }
    WaitAllWorkDone() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._leftCnt <= 0)
                return true;
            while (true) {
                if (this._leftCnt <= 0) {
                    return true;
                }
                yield this.delay();
            }
        });
    }
    delay(ms = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => setTimeout(resolve, ms));
        });
    }
}
exports.AsyncWorkMonitor = AsyncWorkMonitor;
//# sourceMappingURL=comm_utils.js.map