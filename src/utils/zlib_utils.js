"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const zlib = __importStar(require("zlib"));
const tmp = __importStar(require("tmp"));
const archiver = __importStar(require("archiver"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
var ECompressType;
(function (ECompressType) {
    ECompressType[ECompressType["NoComp"] = 0] = "NoComp";
    ECompressType[ECompressType["Zip"] = 1] = "Zip";
    ECompressType[ECompressType["GZip"] = 2] = "GZip";
    ECompressType[ECompressType["Flate"] = 3] = "Flate";
    ECompressType[ECompressType["Max"] = 4] = "Max"; // Max
})(ECompressType = exports.ECompressType || (exports.ECompressType = {}));
function compressStream(src, type, options) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (type) {
            case ECompressType.GZip:
                {
                    return zlib.gzipSync(src, options);
                }
            case ECompressType.Flate:
                {
                    return zlib.deflateSync(src, options);
                }
            case ECompressType.Zip:
                {
                    if (src instanceof Buffer) {
                        return yield zipWithStream(src, options ? options.level : undefined);
                    }
                    else if (src instanceof ArrayBuffer || src instanceof Uint8Array
                        || src instanceof Uint8ClampedArray || src instanceof Uint16Array
                        || src instanceof Uint32Array || src instanceof Int8Array
                        || src instanceof Int16Array || src instanceof Int32Array
                        || src instanceof Float32Array || src instanceof Float64Array) {
                        return yield zipWithStream(new Buffer(src), options ? options.level : undefined);
                    }
                }
        }
        return Promise.reject(`type ${typeof src} not supported!`);
    });
}
exports.compressStream = compressStream;
const DefaultZipConfig = { store: true, zlib: { level: 0 } };
function doZipWithFolder(src, dest, options) {
    if (!options) {
        options = DefaultZipConfig;
    }
    let output = fs.createWriteStream(dest);
    let zip = archiver.create('zip', options);
    zip.on('finish', () => {
        console.info(`* compress zip [${dest}] complete success!`);
    });
    zip.on('error', function (err) {
        console.error(`* compress zip [${dest}] failure!`);
        throw err;
    });
    zip.pipe(output);
    zip.directory(src, false);
    zip.finalize();
    console.info(`start compress zip [${dest}]...`);
}
exports.doZipWithFolder = doZipWithFolder;
function doZipWithFileList(fileLst, resDir, dest) {
    let output = fs.createWriteStream(dest);
    let zip = archiver.create('zip', { store: true, zlib: { level: 0 } });
    zip.pipe(output);
    for (const file of fileLst) {
        zip.append(path.join(resDir, file), { name: file });
    }
    zip.finalize();
    zip.on('finish', () => {
        console.info(`* compress zip [${dest}] complete success!`);
    });
    zip.on('error', (errorMsg) => {
        console.error(`* compress zip [${dest}] failure!`);
        console.error(errorMsg.message);
        throw errorMsg;
    });
    console.info(`start compress zip [${dest}]...`);
}
exports.doZipWithFileList = doZipWithFileList;
function zipWithStream(buffer, level = 6, entryName = 'ZipBytes') {
    return __awaiter(this, void 0, void 0, function* () {
        const storeMode = level < 0;
        level = Math.min(Math.max(0, level), 9);
        console.info(`start compress zip stream...`);
        const tmpfile = tmp.fileSync(); // don't input keep will clean after itself
        let output = fs.createWriteStream(tmpfile.name);
        let zip = archiver.create('zip', { zlib: { level: level }, store: storeMode });
        zip.pipe(output);
        zip.append(buffer, { name: entryName });
        zip.finalize();
        return new Promise((resolve, reject) => {
            zip.on('finish', () => {
                console.info(`* compress zip stream complete success!`);
                const compression_buffer = fs.readFileSync(tmpfile.fd, { encoding: null });
                resolve(compression_buffer);
            });
            zip.on('error', (errorMsg) => {
                fs.unlinkSync(tmpfile.name);
                console.error(`* compress zip stream failure!`);
                console.error(errorMsg.message);
                reject(errorMsg.message);
            });
        });
    });
}
exports.zipWithStream = zipWithStream;
//# sourceMappingURL=zlib_utils.js.map