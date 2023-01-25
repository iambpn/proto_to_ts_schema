import * as fs from "fs/promises";
import { buildTsFile } from "./BuildTsFile";
import { parseProto } from "./ProtoParser";
import cli from "command-line-args";
import path from "path";

export async function ConvertProtoToTs(protoPath: string, outPath: string) {
  const protoFile = await fs.readFile(protoPath, { encoding: "utf-8" });
  const parsedData = await parseProto(protoFile);
  const zodFile = buildTsFile(parsedData);
  await fs.writeFile(outPath, zodFile, { encoding: "utf-8" });
}

// ConvertProtoToTs("./Example/test.proto", "./out.ts");

type Options = {
  proto_files?: string[];
  proto_path?: string;
  out?: string;
  config?: string;
};

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
    ]) as Options;
  } catch (error: any) {
    throw error.message;
  }
}

type ConfiguredOption = Required<Omit<Options, "config">> & Pick<Options, "config">;
async function configureArgs(options: Options): Promise<ConfiguredOption> {
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
    localOptions.proto_files = files.filter((file) => path.extname(file) === ".proto").map((file) => path.join(localOptions.proto_path, file));
  }

  return localOptions;
}

async function isFileExist(file_path: string): Promise<boolean> {
  try {
    await fs.stat(file_path);
    return true;
  } catch (error) {
    return false;
  }
}

(async () => {
  const options = getCliOptions();
  const configuredOptions = await configureArgs(options);

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
    await ConvertProtoToTs(file, path.join(configuredOptions.out, fileName.split(".")[0] + ".ts"));
  });
  if (parsePromise) {
    await Promise.all(parsePromise);
  }
})();

//TODO: Global variable are compounding on every call
