"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const zlib = __importStar(require("zlib"));
function zipStream(src, options) {
    return zlib.deflateSync(src, options);
    // return zlib.gzipSync(src, options);
}
exports.zipStream = zipStream;
//# sourceMappingURL=zlib_utils.js.map