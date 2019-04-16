import * as fs from 'fs';
import * as path from 'path';
import * as crc32 from 'buffer-crc32';
import * as config_tpl from '../config_tpl.json';
import * as match_utils from './utils/match_utils';
import {BufferWriter} from './utils/buffer/BufferWriter'
import * as zlib_utils from './utils/zlib_utils';
import * as fs_utils from './utils/fs_utils';
import { compareStr } from './utils/comm_utils.js';

type FileInfo = {
	path: string;
	relative_path: string;
	crc: number;
	size: number;
};

type FMSFileInfo = {
	path_idx : number;
	name_idx : number;
	crc : number;
	size : number;
};

// header version
const HeaderVersion = 0x01190404;
const HeaderIdent = new Buffer('FTS\0');

class CStringTable {
	public calcIdx(s: string): number {
		if (s.length >= 256) throw `file relative path or file name lenght must less than 256`;
		let idx = this._stringMap.get(s);
		if (idx != undefined) return idx;
		idx = this._stringTable.length;
		this._stringMap.set(s, idx);
		this._stringTable.push(s);
		return idx;
	}
	public get stringTable() : Readonly<Array<string>> { return this._stringTable; }

	private readonly _stringTable = new Array<string>();
	private readonly _stringMap = new Map<string, number>();
}

class CFMSFData {
	public readonly files = new Array<FMSFileInfo>();
	public stringTable = new CStringTable();
}

export async function execute(config: typeof config_tpl, outfile: string): Promise<number> {
	const startTick = Date.now();
	const fileInfoLst = new Array<FileInfo>();
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
	const buffer = await makeBuffer(config, fmtData);
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
}

function makeFileInfoList(config: typeof config_tpl, fileInfoLst: Array<FileInfo>) : boolean {
	const fileRelativeMap = new Map<string, string>();
	for (const filter of config.list) {
		const fl = new Array<string>();
		match_utils.findMatchFiles(filter.filters, filter.path, fl);
		for (const p of fl) {
			const buff = fs.readFileSync(p);
			const fi: FileInfo = {path			:p, 
								  relative_path	:path.relative(filter.relative, p).replace(/\\/g, '/'),
								  crc:			crc32.unsigned(buff),
								  size:			buff.byteLength};
			if (fileRelativeMap.has(fi.relative_path)) {
				throw `duplicate relative path [${fi.relative_path}] at [${fileRelativeMap.get(fi.relative_path)}] and [${fi.path}]`;
			}
			fileInfoLst.push(fi);
			fileRelativeMap.set(fi.relative_path, fi.path);
		}
	}
	fileInfoLst.sort((a, b)=>{
		return compareStr(a.relative_path, b.relative_path);
	});
	console.log(`total found file : ${fileInfoLst.length}`);
	return true;
}

function makeFMTData(config: typeof config_tpl, fileInfoLst: Array<FileInfo>): CFMSFData|undefined {
	const fmtData = new CFMSFData();
	for (const fi of fileInfoLst) {
		const separator = fi.relative_path.lastIndexOf('/');
		const filepath = fi.relative_path.substr(0, separator);
		const filename = fi.relative_path.substr(separator+1);
		const realfile_name = config.strip_ext ? fs_utils.getFileWithoutExtName(filename) : filename;
		fmtData.files.push({path_idx	: fmtData.stringTable.calcIdx(filepath),
							name_idx	: fmtData.stringTable.calcIdx(realfile_name),
							crc			: fi.crc,
							size		: fi.size});
	}
	return fmtData;
}

async function makeBuffer(config: typeof config_tpl, fmtData : CFMSFData) : Promise<Uint8Array> {
	const useCompression = config.compress && config.compress.type 
							&& config.compress.type > zlib_utils.ECompressType.NoComp 
							&& config.compress.type < zlib_utils.ECompressType.Max
							&& config.compress.level > 0 && config.compress.level < 10;

	const littleEndian = config.endian == 'LE';
	console.log(`compression mode : ${useCompression?zlib_utils.ECompressType[config.compress.type] + " level : " + (config.compress.level || "default (6)"):"No Compression"}`);

	// calc buff size
	const HeaderSize = 64; // header size
	const FileInfoSize = 2/*path idx*/ + 2 /* name idx */ + 4 /* crc32 */ + 4 /* file size */;

	// write datas
	// write string table
	const dataWriter = new BufferWriter();
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
		const compress_buffer = await zlib_utils.compressStream(dataWriter.buffer, config.compress.type, config.compress);
		if (!compress_buffer) {
			Promise.reject(`ERROR : compression failure with config : \n${JSON.stringify(config.compress)}\n`);
		}
		dataBuffer = compress_buffer;
	}

	// write header
	const headerWriter = new BufferWriter(HeaderSize);
	headerWriter.writeBuffer(HeaderIdent); // ident
	headerWriter.setLittleEndianMode(littleEndian);
	headerWriter.writeUint8(littleEndian ? 1 : 0); // endian mode 1 : little endian 0 : big endian
	headerWriter.writeUint8(useCompression ? config.compress.type : 0); // compression type
	headerWriter.writeBuffer(Buffer.alloc(2)); // reserved
	headerWriter.writeUint32(HeaderVersion); // file version
	headerWriter.writeUint32(originDataSize); // data size
	headerWriter.writeUint32(dataBuffer.byteLength); // compression size
	headerWriter.writeUint32(stringTableDataSize); // string table size
	headerWriter.writeUint32(fmtData.stringTable.stringTable.length); // string count
	headerWriter.writeUint32(fileInfoDataSize); // file size
	headerWriter.writeUint32(fmtData.files.length); // file count
	const headerReservedSize = HeaderSize - headerWriter.position;
	if (headerReservedSize < 0) {
		Promise.reject(`write header error. header size incorrect(expect:${HeaderSize} actual:${headerWriter.position})`);
	}
	headerWriter.writeBuffer(Buffer.alloc(headerReservedSize));
	headerWriter.writeBuffer(dataBuffer);

	return headerWriter.buffer;
}
