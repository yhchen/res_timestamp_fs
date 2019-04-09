import * as fs from 'fs';
import * as path from 'path';
import * as argv from 'argv';
import { execute } from './src/work.js';
import * as config_tpl from './config_tpl.json';

let gConfig: typeof config_tpl = config_tpl;

function printHelp() {
    console.error('Usage :');
    argv.help();
    console.error('config template : ');
    console.error(JSON.stringify(config_tpl, undefined, 4));
}

// gen version
import * as pkg from './package.json';
argv.version(pkg.version);

const ParamOutFilePath = 'out-file';
const ParamConfigurePath = 'config-path';

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
        name:       ParamConfigurePath,
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

async function mainAsync(): Promise<number> {
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
        const config_context = fs.readFileSync(config_file, {flag:'r', encoding:'utf8'});
        try {
            gConfig = JSON.parse(config_context);
        } catch (ex) {
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
        return await execute(gConfig, outputfile);
    } catch (ex) {
        console.error('ERROR : GOT EXCEPTION : ');
        console.error(ex);
        return -10001;
    }
}

async function main() {
    process.exitCode = await mainAsync();
}

// call main
main();
