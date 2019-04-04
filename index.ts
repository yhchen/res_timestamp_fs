import * as fs from 'fs';
import * as path from 'path';
import * as argv from 'argv';
import { execute } from './src/work.js';
import * as config_tpl from './config_tpl.json';

let config: typeof config_tpl = config_tpl;

function printHelp() {
    console.error('Usage :');
    argv.help();
}

// gen version
import * as pkg from './package.json';
argv.version(pkg.version);

const ParamOutFilePath = 'out-file';
const ConfigurePath = 'list-filters';

// gen args
argv.option([
    {
        name:       ParamOutFilePath,
        short:      'o',
        type:       'path',
        description:'Output time stamp file path',
        example:    '${path_relative_to_cwd_or_absolute}/res.tstm',
    },
    {
        name:       ConfigurePath,
        short:      'c',
        type:       'path',
        description:'configure file path.',
        example:    './config_tpl.json',
    },
]);

function resolvePath(s: string): string {
    if (!s) return '';
    if (path.isAbsolute(s)) return s;
    return path.join(process.cwd(), s);
}

function main(): number {
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
        return execute(config, outputfile);
    } catch (ex) {
        console.error('ERROR : GOT EXCEPTION : ');
        console.error(ex);
        return -10001;
    }
}

process.exit(main());
