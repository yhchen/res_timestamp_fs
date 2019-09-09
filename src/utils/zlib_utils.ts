import * as zlib from 'zlib';
import * as archiver from 'archiver';
import * as path from 'path';
import * as fs from 'fs';
import * as fs_utils from './fs_utils'

export enum ECompressType {
	NoComp = 0, // no compression
	Zip = 1, // zip
	Flate = 2, //inflate and deflate
	GZip = 3, // gzip

	Max // Max
}

export async function compressStream(src: zlib.InputType, type: ECompressType, options?: zlib.ZlibOptions): Promise<Buffer> {
	switch (type) {
		case ECompressType.GZip:
			{
				// return zlib.gzipSync(src, options); // gzip temporary not support(use deflate instand)
				return zlib.deflateSync(src, options);
			}
		case ECompressType.Flate:
			{
				return zlib.deflateSync(src, options);
			}
		case ECompressType.Zip:
			{
				if (src instanceof Buffer) {
					return await zipWithStream(src, options ? options.level : undefined);
				} else if (src instanceof ArrayBuffer || src instanceof Uint8Array
					|| src instanceof Uint8ClampedArray || src instanceof Uint16Array
					|| src instanceof Uint32Array || src instanceof Int8Array
					|| src instanceof Int16Array || src instanceof Int32Array
					|| src instanceof Float32Array || src instanceof Float64Array) {
					return await zipWithStream(new Buffer(src), options ? options.level : undefined);
				}
			}
	}
	return Promise.reject(`type ${typeof src} not supported!`);
}

const DefaultZipConfig: archiver.ArchiverOptions = { store: true, zlib: { level: 0 } };

export function doZipWithFolder(src: string, dest: string, options?: archiver.ArchiverOptions) {
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

export function doZipWithFileList(fileLst: string[], resDir: string, dest: string) {
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

// -------------------- for test... --------------------
// import * as unzip from "unzip";
// import * as stream from 'stream';
// -------------------- for test... --------------------

export async function zipWithStream(buffer: Buffer, level: number = 6, entryName: string = 'ZipBytes'): Promise<Buffer> {
	const storeMode = level <= 0;
	level = Math.min(Math.max(0, level), 9);
	console.info(`start compress zip stream...`);
	const tmpdir = await fs_utils.makeTempDirectory();
	const tmpfile = path.join(tmpdir, Date.now().toString() + '.zip');
	let output = fs.createWriteStream(tmpfile);
	let zip = archiver.create('zip', { zlib: { level }, store: storeMode });
	zip.pipe(output);
	zip.append(buffer, { name: entryName });
	zip.finalize();
	return new Promise((resolve, reject) => {
		zip.on('finish', () => {
			setTimeout(() => { // delay handle due to date incomplete
				console.info(`* compress zip stream complete success!`);
				const compression_buffer = fs.readFileSync(output.path, { encoding: null });
				console.info(`* origin size : ${buffer.byteLength}    compress size : ${compression_buffer.byteLength}      precent : ${Math.round(compression_buffer.byteLength / buffer.byteLength * 10000) / 100}%`);
				resolve(compression_buffer);

				// -------------------- for test... --------------------
				// new stream.PassThrough()
				//  .pipe(unzip.Parse())
				//  .on('entry', function (entry: unzip.Entry) {
				//    var fileName = entry.path;
				//    var type = entry.type; // 'Directory' or 'File'
				//    var size = entry.size;
				//    if (fileName === "this IS the file I'm looking for") {
				//      entry.pipe(fs.createWriteStream('output/path'));
				//    } else {
				//      entry.autodrain();
				//    }
				//  })
				//  .end(compression_buffer);
				// -------------------- for test... --------------------

			}, 16);
		});
		// zip.on('data', (data: archiver.EntryData)=>{
		// 	// console.log(data);
		// })
		const onWarningOrError = (errorMsg: archiver.ArchiverError) => {
			fs.unlinkSync(tmpfile);
			console.error(`* compress zip stream failure!`);
			console.error(errorMsg.message);
			reject(errorMsg.message);
		}
		zip.on('error', onWarningOrError);
		zip.on('warning', onWarningOrError);
	});
}
