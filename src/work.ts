import * as fs from 'fs';
import * as path from 'path';
import * as crc32 from 'buffer-crc32';
import * as config_tpl from '../config_tpl.json';
import * as match_utils from './utils/match_utils';
import * as zlib_utils from './utils/zlib_utils';
import * as fs_utils from './utils/fs_utils';

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
const HeaderIdent = 'FST\0';

class CStringTable {
	public calcIdx(s: string): number {
		if (s.length >= 256) throw `file relative path or file name lenght must less than 256`;
		let idx = this._stringMap.get(s);
		if (idx != undefined) return idx;
		idx = this._stringTable.length;
		this._stringMap.set(s, idx);
		this._stringTable.push(s);
		this._size += s.length + 2; // string length + 1 byte store string length + 1 byte string end character
		return idx;
	}
	public get stringTable() : Readonly<Array<string>> { return this._stringTable; }
	public get size() { return this._size; }

	private readonly _stringTable = new Array<string>();
	private readonly _stringMap = new Map<string, number>();
	private _size = 0;
}

class CFMSFData {
	public readonly files = new Array<FMSFileInfo>();
	public stringTable = new CStringTable();
}

export function execute(config: typeof config_tpl, outfile: string): number {
	const startTick = Date.now();
	const fileInfoLst = new Array<FileInfo>();
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
			fileInfoLst.push(fi);
			if (fileRelativeMap.has(fi.relative_path)) {
				throw `duplicate relative path [${fi.relative_path}] at [${fileRelativeMap.get(fi.relative_path)}] and [${fi.path}]`;
			}
			fileRelativeMap.set(fi.relative_path, fi.path);
		}
	}
	return true;
}

function makeFMTData(fileInfoLst: Array<FileInfo>): CFMSFData|undefined {
	const fmtData = new CFMSFData();
	for (const fi of fileInfoLst) {
		const separator = fi.relative_path.lastIndexOf('/');
		const filepath = fi.relative_path.substr(0, separator);
		const filename = fi.relative_path.substr(separator+1);
		fmtData.files.push({path_idx	: fmtData.stringTable.calcIdx(filepath),
							name_idx	: fmtData.stringTable.calcIdx(filename),
							crc			: fi.crc,
							size		: fi.size});
	}
	return fmtData;
}

function makeBuffer(fmtData : CFMSFData) : Buffer {
	// calc buff size
	const HeaderSize = 32;
	const FileInfoSize = 2/*path idx*/ + 2 /* name idx */ + 4 /* crc32 */ + 4 /* file size */;
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
		offset = buffer.writeUInt8(0, offset);
	}
	for (let fi of fmtData.files) {
		offset = buffer.writeUInt16BE(fi.path_idx, offset);
		offset = buffer.writeUInt16BE(fi.name_idx, offset);
		offset = buffer.writeUInt32BE(fi.crc, offset);
		offset = buffer.writeUInt32BE(fi.size, offset);
	}

	return buffer;
}

function makeCompression(config: typeof config_tpl, buffer: Buffer) : Buffer | undefined {
	const stream = zlib_utils.zipStream(buffer, config.compress);
	return buffer;
}