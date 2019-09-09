# res_timestamp_fs

## Desc

resource time stamp build tools and runtime library

## Usage

```sh
Usage: node ./index.js [options]

    --help, -h
        Displays help information about this script
        'F:\GitHub\yhchen\res_timestamp_fs\index.js -h' or 'F:\GitHub\yhchen\res_timestamp_fs\index.js --help'

    --version
        Displays version info
        F:\GitHub\yhchen\res_timestamp_fs\index.js --version

    --out-file, -o
        Output time stamp file path
        ${path_relative_to_cwd_or_absolute}/res.tstm

    --config-path, -c
        configure file path.
        ./config_tpl.json

```

## config template

```json
{
    "endian help - ": "BE - Big endian      LE - Little endian",
    "endian": "LE",
    "strip_file_extension": true,
    "compress": {
        "type help - ": "0: no compression 1: zip 2: gzip 3: flate(deflate and inflate)",
        "type": 1,
        "level": 9
    },
    "list": [
        {
            "path": "./test/files",
            "relative": "./test/files/",
            "filters help -" : "**/* for all file and sub folder. add '!' at the begin of line for ignore the specified group.",
            "filters": [
                "**/*",
                "!/src/**/*.luac"
            ]
        }
    ],
}

```
