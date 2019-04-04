"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crc32 = __importStar(require("buffer-crc32"));
const comm_utils = __importStar(require("./utils/comm_utils"));
const match_utils = __importStar(require("./utils/match_utils"));
const zlib_utils = __importStar(require("./utils/zlib_utils"));
const fs_utils = __importStar(require("./utils/fs_utils"));
// header version
const HeaderVersion = 0x01190404;
const HeaderIdent = 'FST\0';
class CStringTable {
    constructor() {
        this._stringTable = new Array();
        this._stringMap = new Map();
        this._size = 0;
    }
    calcIdx(s) {
        if (s.length >= 256)
            throw `file relative path or file name lenght must less than 256`;
        let idx = this._stringMap.get(s);
        if (idx != undefined)
            return idx;
        idx = this._stringTable.length;
        this._stringMap.set(s, idx);
        this._stringTable.push(s);
        this._size += s.length + 1; // string length + 1 byte store string length
        return idx;
    }
    get stringTable() { return this._stringTable; }
    get size() { return this._size; }
}
class CFMSFData {
    constructor() {
        this.files = new Array();
        this.stringTable = new CStringTable();
    }
}
function execute(config, outfile) {
    const startTick = Date.now();
    const fileInfoLst = new Array();
    console.log(`generate file list...`);
    if (!makeFileInfoList(config, fileInfoLst)) {
        throw `INNER ERROR : make file info List failure!`;
    }
    console.log(`generate fmt datas...`);
    const fmtData = makeFMTData(fileInfoLst);
    if (!fmtData) {
        throw `INNER ERROR : make fmt data failure!`;
    }
    console.log(`generate buffer...`);
    const buffer = makeBuffer(fmtData);
    if (!buffer) {
        throw `INNER ERROR : write buffer failure.`;
    }
    console.log(`generate compression...`);
    const filebuffer = makeCompression(config, buffer);
    if (!filebuffer) {
        throw `ERROR : compression failure with config : \n${JSON.stringify(config.compress)}\n`;
    }
    console.log(`write buffer to file : ${outfile}...`);
    if (fs.existsSync(outfile)) {
        fs_utils.rm(outfile);
    }
    fs.writeFileSync(outfile, filebuffer);
    console.log(`generate res time stamp file success.`);
    console.log(`file size : ${filebuffer.byteLength}`);
    console.log(`total use time : ${(Date.now() - startTick) / 1000} sec`);
    return 0;
}
exports.execute = execute;
function makeFileInfoList(config, fileInfoLst) {
    const fileRelativeMap = new Map();
    for (const filter of config.list) {
        const fl = new Array();
        match_utils.findMatchFiles(filter.filters, filter.path, fl);
        for (const p of fl) {
            const buff = fs.readFileSync(p);
            const fi = { path: p,
                relative_path: path.relative(filter.relative, p).replace(/\\/g, '/'),
                crc: crc32.unsigned(buff),
                size: buff.byteLength };
            fileInfoLst.push(fi);
            if (fileRelativeMap.has(fi.relative_path)) {
                throw `duplicate relative path [${fi.relative_path}] at [${fileRelativeMap.get(fi.relative_path)}] and [${fi.path}]`;
            }
            fileRelativeMap.set(fi.relative_path, fi.path);
        }
    }
    return true;
}
function makeFMTData(fileInfoLst) {
    const fmtData = new CFMSFData();
    for (const fi of fileInfoLst) {
        const separator = fi.relative_path.lastIndexOf('/');
        const filepath = fi.relative_path.substr(0, separator);
        const filename = fi.relative_path.substr(separator + 1);
        fmtData.files.push({ path_idx: fmtData.stringTable.calcIdx(filepath),
            name_idx: fmtData.stringTable.calcIdx(filename),
            crc: fi.crc,
            size: fi.size });
    }
    return fmtData;
}
function makeBuffer(fmtData) {
    // calc buff size
    const HeaderSize = 32;
    const FileInfoSize = 2 /*path idx*/ + 2 /* name idx */ + 4 /* crc32 */ + 4 /* file size */;
    const bufferSize = HeaderSize + fmtData.stringTable.size + fmtData.files.length * FileInfoSize;
    // alloc buffer
    const buffer = Buffer.alloc(bufferSize);
    // write header
    let offset = 0;
    offset = buffer.write(HeaderIdent, 'ascii'); // ident
    offset = buffer.writeUInt32BE(HeaderVersion, offset); // file version
    offset = buffer.writeUInt32BE(bufferSize, offset); // file size
    offset = buffer.writeUInt32BE(fmtData.stringTable.size, offset); // string table size
    offset = buffer.writeUInt32BE(fmtData.stringTable.stringTable.length, offset); // string count
    offset = buffer.writeUInt32BE(fmtData.files.length, offset); // file count
    offset = buffer.writeUInt32BE(fmtData.files.length * FileInfoSize, offset); // file size
    if (offset > HeaderSize) {
        throw `INNER ERROR : File header size = ${offset} incorrect!`;
    }
    offset = HeaderSize;
    // write datas
    for (let s of fmtData.stringTable.stringTable) {
        offset = buffer.writeUInt8(s.length, offset); // write string length
        offset += buffer.write(s, offset); // write string
    }
    for (let fi of fmtData.files) {
        offset = buffer.writeUInt16BE(fi.path_idx, offset);
        offset = buffer.writeUInt16BE(fi.name_idx, offset);
        offset = buffer.writeUInt32BE(fi.crc, offset);
        offset = buffer.writeUInt32BE(fi.size, offset);
    }
    return buffer;
}
function makeCompression(config, buffer) {
    if (!config.compress || comm_utils.count(config.compress) == 0) {
        return buffer;
    }
    const stream = zlib_utils.zipStream(buffer, config.compress);
    return stream;
}
//# sourceMappingURL=work.js.map