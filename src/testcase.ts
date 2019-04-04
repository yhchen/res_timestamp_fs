import * as fs from 'fs';
import * as path from 'path';
import * as fs_utils from './utils/fs_utils';

function random_files(dir: string, file_count: number, folder_count: number): boolean {
	if (fs.existsSync(dir)) {
		fs_utils.rm(dir);
	}
	fs_utils.mkdir(dir);
	const folder_list = new Array<string>();
	const file_list = new Array<string>();
	folder_list.push('.');
	for (let i = 0; i < folder_count; ++i) {
		const depth = Math.round(Math.random() * 5) + 1;
		let folder = dir;
		for (let d = 0; d < depth; ++d) {
			let name = '';
			const name_len = (Math.round(Math.random() * 2) + 1);
			for (let n = 0; n < name_len; ++n) {
				name += randomName(n);
			}
			if (folder.length + name.length >= 256) {
				break;
			}
			folder += '/' + name;
		}
		folder_list.push(folder);
		fs_utils.mkdir(folder);
	}

	for (let i = 0; i < file_count; ++i) {
		const folder = folder_list[Math.round(Math.random() * (folder_list.length - 1))];
		let name = '';
		for (let i = 0; i < 3; ++i) {
			name += randomName();
		}
		const file = path.join(folder, name + '.txt');
		file_list.push(file);
		fs.writeFileSync(file, Buffer.alloc(1024 * 1024 * 0.5 * Math.random()), {flag:'w+'});
	}
	return true;
}

const NameMap = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y','z', '0', '1', '2','3','4','5','6','7','8','9'];

function randomName(maxLen?:number) : string {
	if (maxLen == undefined) maxLen = 4;
	const len = Math.round(Math.random() * maxLen) + 4;
	let s = '';
	for (let i = 0; i < len; ++i) {
		s += NameMap[Math.round(Math.random() * (NameMap.length-1))];
	}
	return s;
}

random_files('./test/files', 22000, 1000);
