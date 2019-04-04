import * as zlib from 'zlib';


export function zipStream(src: Buffer, options?: zlib.ZlibOptions): Buffer {
	return zlib.deflateSync(src, options);
	// return zlib.gzipSync(src, options);
}
