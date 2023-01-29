# proto_to_ts

(Beta) proto to ts schema compiler.

## Usage

Proto to TS

`config`: Path to the config file which must be in js format (currently not supported). (default: CWD/p2t.js) usage: --config [-c]

`help`: To show help docs. usage: --help [-h]

`out`: Path to output folder. (default: CWD) usage: --out <path> [-o <path>]

`proto_files`: List of proto files to compile to TS. (default: All proto files inside of 'proto_path' or CWD) usage: --proto_files <filename.proto> <filename2.proto> [-f <files.prot>]

`proto_path`: Path to Proto folder, (default: CWD) usage: --proto_path <path> [-p <path>]

## Known Caveats

(There are many caveats in this compiler still to be found but here are some known caveats)

- Ordering of the `message` in proto matters. You need to declare proto message first then only you can use it else it will result in error.
