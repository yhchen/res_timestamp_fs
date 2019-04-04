"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const archiver_1 = __importDefault(require("archiver"));
const fs_1 = __importStar(require("fs"));
const zlib_1 = require("zlib");
const DefaultZipConfig = { store: false, zlib: { level: zlib_1.constants.Z_MAX_LEVEL } };
function doZipWithFolder(src, dest, options) {
    let output = fs_1.default.createWriteStream(dest);
    let zip = makeZipObj(output, options, dest);
    zip.directory(src, false);
    // zip.bulk([
    // 	{ src: [ src + '/**']}
    // ]);
    zip.finalize();
    console.log('Start compress [' + dest + ']...');
}
exports.doZipWithFolder = doZipWithFolder;
function zipStream(src, options) {
    const ws = new fs_1.WriteStream();
    let zip = makeZipObj(ws, options, 'stream');
    zip.write(src, 'Buffer');
    zip.finalize();
    return ws;
}
exports.zipStream = zipStream;
function makeZipObj(stream, options, desc) {
    if (!options) {
        options = DefaultZipConfig;
    }
    let zip = archiver_1.default.create('zip', options);
    zip.on('error', function (err) {
        console.error(`compress [${desc}] failure!`);
        throw err;
    });
    zip.on('finish', () => {
        console.log(`compress [${desc}] success.`);
    });
    zip.pipe(stream);
    return zip;
}
//# sourceMappingURL=zlib_utils.js.map