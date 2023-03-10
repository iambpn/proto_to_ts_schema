import * as fs from "fs/promises";
import cli from "command-line-args";
import path from "path";
import { ConvertProtoToTs } from "./BuildTsFile";
import { P2tType } from "./P2tType";
import { ConfiguredOption, OptionKeys, Options } from "./CliTypes";

function getCliOptions(): Options {
  try {
    return cli([
      {
        name: "proto_files",
        alias: "f",
        type: String,
        multiple: true,
        defaultOption: true,
      },
      {
        name: "proto_path",
        alias: "p",
        type: String,
      },
      {
        name: "out",
        alias: "o",
        type: String,
      },
      {
        name: "config",
        alias: "c",
        type: String,
      },
      {
        name: "help",
        alias: "h",
        type: Boolean,
      },
    ]) as Options;
  } catch (error: any) {
    throw error.message;
  }
}

async function getConfigureArgs(options: Options): Promise<ConfiguredOption> {
  const localOptions = JSON.parse(JSON.stringify(options)) as ConfiguredOption;
  localOptions.proto_path = localOptions.proto_path ?? process.cwd();
  localOptions.out = localOptions.out ?? process.cwd();

  const isOutExist = await isFileExist(localOptions.out);
  if (!isOutExist) {
    throw `Output Path "${localOptions.out}" is not a valid folder path.`;
  }

  const isProtoPathExist = await isFileExist(localOptions.proto_path);
  if (!isProtoPathExist) {
    throw `Proto Path "${localOptions.proto_path}" is not a valid folder path.`;
  }

  if (!options.proto_files) {
    const files = await fs.readdir(localOptions.proto_path);
    localOptions.proto_files = files.filter((file) => path.extname(file) === ".proto");
  }

  if (!options.config) {
    const defaultConfigPath = path.join(process.cwd(), "p2t.js");
    if (await isFileExist(defaultConfigPath)) {
      localOptions.config = defaultConfigPath;
    }
  } else if (await isFileExist(options.config)) {
    localOptions.config = options.config;
  }

  localOptions.proto_files = localOptions.proto_files.map((file) => path.join(localOptions.proto_path, file));
  return localOptions;
}

function showHelp() {
  const applicationName = "Proto to TS Schema";

  const optionsDescription: { [x in OptionKeys]: string } = {
    config: "Path to the config file which must be in js/ts format. (default: CWD/p2t.js)",
    help: "To show help docs.",
    out: "Path to output folder. (default: CWD)",
    proto_files: "List of proto files to compile to TS. (default: All proto files inside of 'proto_path' or CWD)",
    proto_path: "Path to Proto folder, (default: CWD)",
  };

  const optionsUsage: { [x in OptionKeys]: string } = {
    config: "--config [-c]",
    help: "--help [-h]",
    out: "--out <path> [-o <path>]",
    proto_files: "--proto_files <filename.proto> <filename2.proto> [-f <files.prot>]",
    proto_path: "--proto_path <path> [-p <path>]",
  };

  const generateDocs = Object.keys(optionsDescription)
    .map((key) => {
      return `
      ${key}: ${optionsDescription[key as OptionKeys]}
      usage: ${optionsUsage[key as OptionKeys]}`;
    })
    .reduce((prev, curr) => {
      return `${prev}\r\n${curr}`;
    }, "");

  console.log(`${applicationName}${generateDocs}`);
}

export async function getConfigurationArgs(): Promise<ConfiguredOption> {
  const options = getCliOptions();
  return getConfigureArgs(options);
}

export async function getP2tConfig(): Promise<P2tType> {
  const options = await getConfigurationArgs();
  if (options.config) {
    const configs = await import(options.config);
    return configs.default;
  }
  return {};
}

async function isFileExist(file_path: string): Promise<boolean> {
  try {
    await fs.stat(file_path);
    return true;
  } catch (error) {
    return false;
  }
}

export async function initializeCli() {
  const options = getCliOptions();

  if (options.help) {
    showHelp();
    return;
  }

  const configuredOptions = await getConfigureArgs(options);

  const parsePromise = configuredOptions.proto_files?.map(async (file) => {
    const isExist = await isFileExist(file);
    if (!isExist) {
      console.log(`File "${file}" is not a valid proto file.`);
      return;
    }
    const fileName = path.basename(file);
    const ext = path.extname(fileName);
    if (ext !== ".proto") {
      console.log(`Path "${file}" is not a valid proto path.`);
      return;
    }
    console.log(file);
    await ConvertProtoToTs(file, path.join(configuredOptions.out, fileName.split(".")[0] + ".ts"));
  });
  if (parsePromise) {
    await Promise.all(parsePromise);
  }
}
