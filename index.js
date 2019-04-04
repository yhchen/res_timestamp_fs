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
const argv = __importStar(require("argv"));
const work_js_1 = require("./src/work.js");
const config_tpl = __importStar(require("./config_tpl.json"));
let config = config_tpl;
function printHelp() {
    console.error('Usage :');
    argv.help();
}
// gen version
const pkg = __importStar(require("./package.json"));
argv.version(pkg.version);
const ParamOutFilePath = 'out-file';
const ConfigurePath = 'list-filters';
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
        name: ConfigurePath,
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
function main() {
    const args = argv.run(process.argv);
    const outputfile = args.options[ParamOutFilePath];
    try {
        for (const filters of config.list) {
            filters.path = resolvePath(filters.path);
            if (!fs.existsSync(filters.path)) {
                throw `ERROR : path ${filters.path} not exists!`;
            }
            filters.relative = filters.relative ? resolvePath(filters.relative) : filters.path;
            if (!fs.existsSync(filters.relative)) {
                throw `ERROR : relative path ${filters.relative} not exists!`;
            }
        }
        return work_js_1.execute(config, outputfile);
    }
    catch (ex) {
        console.error('ERROR : GOT EXCEPTION : ');
        console.error(ex);
        return -10001;
    }
}
process.exit(main());
//# sourceMappingURL=index.js.map