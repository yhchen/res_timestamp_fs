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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crc32 = __importStar(require("buffer-crc32"));
const match_utils = __importStar(require("./utils/match_utils"));
const BufferWriter_1 = require("./utils/buffer/BufferWriter");
const zlib_utils = __importStar(require("./utils/zlib_utils"));
const fs_utils = __importStar(require("./utils/fs_utils"));
// header version
const HeaderVersion = 0x01190404;
const HeaderIdent = new Buffer('FTS\0');
const HeaderIdent_NoCompress = new Buffer('FTC\0');
class CStringTable {
    constructor() {
        this._stringTable = new Array();
        this._stringMap = new Map();
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
        return idx;
    }
    get stringTable() { return this._stringTable; }
}
class CFMSFData {
    constructor() {
        this.files = new Array();
        this.stringTable = new CStringTable();
    }
}
function execute(config, outfile) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTick = Date.now();
        const fileInfoLst = new Array();
        console.log(`generate file list...`);
        if (!makeFileInfoList(config, fileInfoLst)) {
            throw `INNER ERROR : make file info List failure!`;
        }
        console.log(`generate fmt datas...`);
        const fmtData = makeFMTData(config, fileInfoLst);
        if (!fmtData) {
            throw `INNER ERROR : make fmt data failure!`;
        }
        console.log(`generate buffer...`);
        const buffer = yield makeBuffer(config, fmtData);
        if (!buffer) {
            throw `INNER ERROR : write buffer failure.`;
        }
        console.log(`write buffer to file : ${outfile}...`);
        if (fs.existsSync(outfile)) {
            fs_utils.rm(outfile);
        }
        fs.writeFileSync(outfile, buffer);
        console.log(`generate res time stamp file success.`);
        console.log(`file size : ${buffer.byteLength}`);
        console.log(`total use time : ${(Date.now() - startTick) / 1000} sec`);
        return 0;
    });
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
function makeFMTData(config, fileInfoLst) {
    const fmtData = new CFMSFData();
    for (const fi of fileInfoLst) {
        const separator = fi.relative_path.lastIndexOf('/');
        const filepath = fi.relative_path.substr(0, separator);
        const filename = fi.relative_path.substr(separator + 1);
        const realfile_name = config.strip_ext ? fs_utils.getFileWithoutExtName(filename) : filename;
        fmtData.files.push({ path_idx: fmtData.stringTable.calcIdx(filepath),
            name_idx: fmtData.stringTable.calcIdx(realfile_name),
            crc: fi.crc,
            size: fi.size });
    }
    return fmtData;
}
function makeBuffer(config, fmtData) {
    return __awaiter(this, void 0, void 0, function* () {
        const useCompression = config.compress && config.compress.type
            && config.compress.type > zlib_utils.ECompressType.NoComp
            && config.compress.type < zlib_utils.ECompressType.Max;
        const littleEndian = config.endian == 'LE';
        console.log(`compression mode : ${useCompression ? zlib_utils.ECompressType[config.compress.type] + "level : " + (config.compress.level || "default (6)") : "No Compression data"}`);
        // calc buff size
        const HeaderSize = 64; // header size
        const FileInfoSize = 2 /*path idx*/ + 2 /* name idx */ + 4 /* crc32 */ + 4 /* file size */;
        // write datas
        // write string table
        const dataWriter = new BufferWriter_1.BufferWriter();
        dataWriter.setLittleEndianMode(littleEndian);
        for (let s of fmtData.stringTable.stringTable) {
            dataWriter.writeStringLT255(s); // write string
        }
        const stringTableDataSize = dataWriter.byteLength;
        // write file info
        for (let fi of fmtData.files) {
            dataWriter.writeUint16(fi.path_idx);
            dataWriter.writeUint16(fi.name_idx);
            dataWriter.writeUint32(fi.crc);
            dataWriter.writeUint32(fi.size);
        }
        const fileInfoDataSize = dataWriter.byteLength - stringTableDataSize;
        if (fileInfoDataSize != FileInfoSize * fmtData.files.length) {
            Promise.reject(`file info data list.`);
        }
        const originDataSize = dataWriter.byteLength;
        let dataBuffer = dataWriter.buffer;
        if (useCompression) {
            console.log(`generate compression...`);
            const compress_buffer = yield zlib_utils.compressStream(dataWriter.buffer, config.compress.type, config.compress);
            if (!compress_buffer) {
                Promise.reject(`ERROR : compression failure with config : \n${JSON.stringify(config.compress)}\n`);
            }
            dataBuffer = compress_buffer;
        }
        // write header
        const headerWriter = new BufferWriter_1.BufferWriter(HeaderSize);
        headerWriter.setLittleEndianMode(littleEndian);
        headerWriter.writeBuffer(useCompression ? HeaderIdent : HeaderIdent_NoCompress); // ident
        headerWriter.writeUint8(littleEndian ? 1 : 0); // file version
        headerWriter.writeUint8(useCompression ? config.compress.type : 0); // compression type
        headerWriter.writeBuffer(Buffer.alloc(2)); // reserved
        headerWriter.writeUint32(HeaderVersion); // file version
        headerWriter.writeUint32(originDataSize); // data size
        headerWriter.writeUint32(dataBuffer.byteLength); // compression size
        headerWriter.writeUint32(stringTableDataSize); // string table size
        headerWriter.writeUint32(fmtData.stringTable.stringTable.length); // string count
        headerWriter.writeUint32(fmtData.files.length); // file count
        headerWriter.writeUint32(fileInfoDataSize); // file size
        const headerReservedSize = HeaderSize - headerWriter.position;
        if (headerReservedSize < 0) {
            Promise.reject(`write header error. header size incorrect(expect:${HeaderSize} actual:${headerWriter.position})`);
        }
        headerWriter.writeBuffer(Buffer.alloc(headerReservedSize));
        headerWriter.writeBuffer(dataBuffer);
        return headerWriter.buffer;
    });
}
//# sourceMappingURL=work.js.map