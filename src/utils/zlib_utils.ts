import archiver from 'archiver';
import fs, { WriteStream } from 'fs';
import { constants } from 'zlib';

const DefaultZipConfig: archiver.ArchiverOptions = {store:false, zlib: { level: constants.Z_MAX_LEVEL }};

export function doZipWithFolder(src: string, dest: string, options?: archiver.ArchiverOptions) {
	let output = fs.createWriteStream(dest);
	let zip = makeZipObj(output, options, dest);
	zip.directory(src, false);
	// zip.bulk([
	// 	{ src: [ src + '/**']}
	// ]);
	zip.finalize();
	console.log('Start compress [' + dest + ']...');
}

export function zipStream(src: Buffer, options?: archiver.ArchiverOptions): WriteStream {
	const ws = new WriteStream();
	let zip = makeZipObj(ws, options, 'stream');
	zip.write(src, 'Buffer');
	zip.finalize();
	return ws;
}

function makeZipObj(stream: WriteStream, options?: archiver.ArchiverOptions, desc?: string): archiver.Archiver {
	if (!options) {
        options = DefaultZipConfig;
    }
	let zip = archiver.create('zip', options);
	zip.on('error', function(err) {
		console.error(`compress [${desc}] failure!`);
		throw err;
	});
	zip.on('finish', ()=>{
		console.log(`compress [${desc}] success.`);
	})
	zip.pipe(stream);
	return zip;
}