"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
const argv = __importStar(require("argv"));
const work_js_1 = require("./src/work.js");
const config_tpl = __importStar(require("./config_tpl.json"));
let gConfig = config_tpl;
function printHelp() {
    console.error('Usage :');
    argv.help();
    console.error('config template : ');
    console.error(JSON.stringify(config_tpl, undefined, 4));
}
// gen version
const pkg = __importStar(require("./package.json"));
argv.version(pkg.version);
const ParamOutFilePath = 'out-file';
const ParamConfigurePath = 'config-path';
// gen args
argv.option([
    {
        name: ParamOutFilePath,
        short: 'o',
        type: 'path',
        description: 'Output time stamp file path',
        example: '${path_relative_to_cwd_or_absolute}/res.tstm',
    },
    {
        name: ParamConfigurePath,
        short: 'c',
        type: 'path',
        description: 'configure file path.',
        example: './config_tpl.json',
    },
]);
function resolvePath(s) {
    if (!s)
        return '';
    if (path.isAbsolute(s))
        return s;
    return path.join(process.cwd(), s);
}
function mainAsync() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = argv.run(process.argv);
        const outputfile = args.options[ParamOutFilePath];
        if (outputfile == undefined) {
            console.error(`argument '-o' not found. argument not complete.`);
            printHelp();
            return -1;
        }
        const config_file = args.options[ParamConfigurePath];
        if (config_file) {
            if (!fs.existsSync(config_file)) {
                console.error(`argument '-c' config file not exist.`);
                printHelp();
                return -2;
            }
            const config_context = fs.readFileSync(config_file, { flag: 'r', encoding: 'utf8' });
            try {
                gConfig = JSON.parse(config_context);
            }
            catch (ex) {
                console.error(`configure file format error.`);
                console.error(ex);
                printHelp();
                return -3;
            }
        }
        try {
            for (const filters of gConfig.list) {
                filters.path = resolvePath(filters.path);
                if (!fs.existsSync(filters.path)) {
                    throw `ERROR : path ${filters.path} not exists!`;
                }
                filters.relative = filters.relative ? resolvePath(filters.relative) : filters.path;
                if (!fs.existsSync(filters.relative)) {
                    throw `ERROR : relative path ${filters.relative} not exists!`;
                }
            }
            return yield work_js_1.execute(gConfig, outputfile);
        }
        catch (ex) {
            console.error('ERROR : GOT EXCEPTION : ');
            console.error(ex);
            return -10001;
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        process.exitCode = yield mainAsync();
    });
}
// call main
main();
//# sourceMappingURL=index.js.map