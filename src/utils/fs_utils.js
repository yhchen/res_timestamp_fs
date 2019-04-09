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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
/**
 * create directory recursive
 * @param dir file or directory
 */
function mkdir(dir) {
    // fs.mkdirSync(dir, {recursive:true});
    if (!fs.existsSync(dir)) {
        const parentDir = path.dirname(dir);
        if (!fs.existsSync(parentDir)) {
            mkdir(parentDir);
        }
        fs.mkdirSync(dir);
    }
    return fs.existsSync(dir);
}
exports.mkdir = mkdir;
const GlobalIgnoreFolderLst = new Set(['.svn', '.git']);
/**
 *
 * @param s add global ignore file or directory in ignore filter
 */
function AddGlobalIgnoreFileOrDir(s) {
    GlobalIgnoreFolderLst.add(s);
}
exports.AddGlobalIgnoreFileOrDir = AddGlobalIgnoreFileOrDir;
/**
 * iterator ${dir} recursive or  in dfs mode.
 * @param dir directory to be iterator
 * @param callback
 * @param recursive
 */
function foreachFolder(dir, callback, recursive = true) {
    let plst = fs.readdirSync(dir);
    for (let p of plst) {
        let spath = path.join(dir, p);
        let isDir = fs.statSync(spath).isDirectory();
        // skip global ignore files(or extension)
        if (GlobalIgnoreFolderLst.has(path.basename(spath))) {
            continue;
        }
        let ret = callback(spath, isDir);
        if (ret == 1 /* BreakAll */) {
            return false;
        }
        else if (ret == 2 /* BreakFolder */) {
            continue;
        }
        if (isDir && recursive) {
            if (!foreachFolder(spath, callback)) {
                return false;
            }
        }
    }
    return true;
}
exports.foreachFolder = foreachFolder;
/**
 * get file full extension
 * example :
 *     /1.pvr.ccz => .pvr.ccz
 *     /path/34kjdfdfjdf.txt.zip => .txt.zip
 *     /my_path/file_no_ext => `[empty string]`
 * @param filename file path
 * @param includeDot include `.` default is `true`
 */
function getFileExtName(filename, includeDot = true) {
    let lastIdx = filename.length;
    for (let i = lastIdx - 1; i > -1; --i) {
        const c = filename[i];
        if (c == '/' || c == '\\') {
            break;
        }
        else if (c == '.') {
            lastIdx = i + 1;
        }
    }
    if (lastIdx == filename.length)
        return ''; // not found...
    return filename.substr(includeDot ? lastIdx - 1 : lastIdx);
}
exports.getFileExtName = getFileExtName;
/**
 * get file name without extension
 * example :
 *     /1.pvr.ccz => .pvr.ccz
 *     /path/34kjdfdfjdf.txt.zip => 34kjdfdfjdf
 *     /my_path/file_no_ext => file_no_ext
 * @param filename file path
 */
function getFileWithoutExtName(filename) {
    const p = path.basename(filename);
    let lastIdx = p.length;
    for (let i = lastIdx - 1; i > -1; --i) {
        const c = p[i];
        if (c == '.') {
            lastIdx = i;
        }
    }
    return p.substr(0, lastIdx);
}
exports.getFileWithoutExtName = getFileWithoutExtName;
/**
 * copy file sync
 * @param src
 * @param dest
 */
function copyFile(src, dest) {
    if (!fs.existsSync(dest)) {
        if (path.basename(src) == path.basename(dest)) {
            mkdir(path.dirname(dest));
        }
        else {
            mkdir(dest);
        }
    }
    try {
        fs.copyFileSync(src, dest);
    }
    catch (err) {
        console.error('ERROR : copy file [' + src + '] to path [' + dest + '] failure!!!');
        console.error(JSON.stringify(err));
        return false;
    }
    return true;
}
exports.copyFile = copyFile;
/**
 * copy directory recursive (sync)
 * @param src
 * @param dest
 * @param extFilter
 */
function copyDir(src, dest, extFilter) {
    if (extFilter && (extFilter.has('*') || extFilter.has('.*'))) {
        extFilter = undefined;
    }
    foreachFolder(src, (srcpath, isDir) => {
        const destpath = path.join(dest, path.relative(src, srcpath));
        if (isDir) {
            mkdir(destpath);
        }
        else {
            if (!extFilter || extFilter.has(getFileExtName(srcpath))) {
                copyFile(srcpath, destpath);
            }
        }
    });
    return true;
}
exports.copyDir = copyDir;
/**
 * copy file or directory recursive (sync)
 * @param src
 * @param dest
 * @param extFilter
 */
function copy(src, dest, extFilter) {
    if (!fs.existsSync(src))
        return false;
    const fstate = fs.statSync(src);
    if (!fstate)
        return false;
    if (fstate.isFile()) {
        return copyFile(src, dest);
    }
    else {
        return copyDir(src, dest, extFilter);
    }
}
exports.copy = copy;
/**
 * remove file or directory recursive
 * @param dir
 */
function rm(dir) {
    if (fs.existsSync(dir)) {
        if (fs.statSync(dir).isFile()) {
            fs.unlinkSync(dir);
        }
        else {
            const files = fs.readdirSync(dir);
            files.forEach(function (file) {
                let curPath = path.join(dir, file);
                if (fs.statSync(curPath).isDirectory()) { // recurse
                    rm(curPath);
                }
                else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(dir);
        }
    }
    return !fs.existsSync(dir);
}
exports.rm = rm;
function makeTempFile(name) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const tempPath = path.join(os.tmpdir(), 'tmp-fs-utils-dir');
            fs.mkdtemp(tempPath, (err, folder) => {
                if (err) {
                    return reject(err);
                }
                const file_name = path.join(folder, name || Date.now().toString());
                console.log(`create temporary file : ${file_name}`);
                resolve(file_name);
            });
        });
    });
}
exports.makeTempFile = makeTempFile;
const delayRemoveList = new Array();
process.on('beforeExit', () => {
    for (const p of delayRemoveList) {
        if (fs.existsSync(p)) {
            rm(p);
        }
    }
});
function makeTempDirectory(perfix) {
    const tempPathPrefix = path.join(os.tmpdir(), perfix || 'tmp-fs-utils-dir');
    const tempPath = fs.mkdtempSync(tempPathPrefix, { encoding: null });
    console.log(`create temporary directory : ${tempPath}`);
    if (!mkdir(tempPath)) {
        console.log(`mkdir ${tempPath} failure!`);
    }
    delayRemoveList.push(tempPath);
    return tempPath;
}
exports.makeTempDirectory = makeTempDirectory;
//# sourceMappingURL=fs_utils.js.map