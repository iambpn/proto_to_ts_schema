import * as fs from "fs/promises";
import { getP2tConfig } from "./Cli";
import { P2tType } from "./P2tType";
import { parseProto } from "./ProtoParser";
import { ProtoJson, MessageHeader, Option, MessageBody, Import, EnumBody, Service, RPCFunction } from "./ProtoParserTypes";

let p2tConfigs: P2tType;
export async function ConvertProtoToTs(protoPath: string, outPath: string, isDebug = false) {
  try {
    p2tConfigs ||= await getP2tConfig();
    const protoFile = await fs.readFile(protoPath, { encoding: "utf-8" });
    const parsedData = await parseProto(protoFile);

    if (isDebug) {
      await fs.writeFile(outPath + ".debug.json", JSON.stringify(parsedData), { encoding: "utf-8" });
    }

    const zodFile = buildTsFile(parsedData);
    await fs.writeFile(outPath, zodFile, { encoding: "utf-8" });
  } catch (error) {
    console.log("Error while parsing file: ", protoPath);
    throw error;
  }
}

export function buildTsFile(proto: ProtoJson) {
  let tsFile = "";
  let LocalMessages: Record<string, string> = {};
  let imports: Import[] = proto.imports ?? [];

  for (const import_path of p2tConfigs.imports ?? []) {
    tsFile += `${import_path.split(";").join("")};\r\n`;
  }

  if (proto.imports && proto.imports.length) {
    for (const importData of proto.imports) {
      try {
        tsFile += `import { ${importData.objs.join(", ")} } from "${importData.pathToPackage}/${importData.packageName}";\r\n`;
      } catch (error) {
        console.log("Error on import: ", importData);
        throw error;
      }
    }
  }
  tsFile += "\r\n";

  if (proto.messages && proto.messages.length) {
    for (const message of proto.messages) {
      try {
        const [content, newImports, newLocalMessages] = buildProtoMessages(message, LocalMessages, imports);
        tsFile += content;
        imports = newImports;
        LocalMessages = newLocalMessages;
      } catch (error) {
        console.log("Error on message: ", message);
        throw error;
      }
    }
  }

  if (proto.services && proto.services.length) {
    for (const service of proto.services) {
      try {
        tsFile += buildProtoServices(service, imports);
      } catch (error) {
        console.log("Error on service: ", service);
        throw error;
      }
    }
  }

  return tsFile;
}

function deepCopyObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function buildProtoServices(service: Service, imports: Import[]): string {
  let file = `export interface ${service.name} {\r\n`;
  for (const rpcFunction of service.rpcFunctions) {
    try {
      file += buildRpcFunctions(rpcFunction, imports);
    } catch (error) {
      console.log("Error on rpc: ", rpcFunction);
      throw error;
    }
  }
  file += "}\r\n";

  return file;
}

function buildRpcFunctions(rpcFunction: RPCFunction | Option, imports: Import[]): string {
  if ("isOption" in rpcFunction) {
    // Skip Options: Do Nothing
    return "";
  }

  const name = `${rpcFunction.name.substring(0, 1).toLowerCase()}${rpcFunction.name.substring(1)}`;
  let args = "";
  if (!rpcFunction.arg.packageName) {
    args = `${rpcFunction.arg.type}`;
  } else {
    const packageName = rpcFunction.arg.packageName;
    const isFound = imports?.find((import_data) => import_data.packageName === packageName);
    if (isFound) {
      args = `${rpcFunction.arg.type}`;
    } else {
      args = `${rpcFunction.arg.packageName.replace(".", "__")}__${rpcFunction.arg.type}`;
    }
  }

  let returns = "";
  if (!rpcFunction.returns.packageName) {
    returns = `${rpcFunction.returns.type}`;
  } else {
    const packageName = rpcFunction.returns.packageName;
    const isFound = imports?.find((import_data) => import_data.packageName === packageName);
    if (isFound) {
      returns = `${rpcFunction.returns.type}`;
    } else {
      returns = `${rpcFunction.returns.packageName.replace(".", "__")}__${rpcFunction.returns.type}`;
    }
  }

  return `  ${name}(data:${args}):${p2tConfigs.rpcFuncReturn ? p2tConfigs.rpcFuncReturn(returns) : returns};\r\n`;
}

/**
 *
 * @param message
 * @param localMessages
 * @param imports
 * @param nestedTo
 * @returns [content, MessageName, localMessages]
 */
function buildProtoMessages(message: MessageHeader | Option, localMessages: Record<string, string>, imports: Import[], nestedTo?: string): [string, Import[], Record<string, string>] {
  let file = "";
  let nestedContent = "";

  let newImports: Import[] = deepCopyObject(imports);
  let newLocalMessages = deepCopyObject(localMessages);

  if ("isOption" in message) {
    // Skip Options: Do Nothing
    return [file, newImports, newLocalMessages];
  }

  const newMessageName = `${nestedTo ? `${nestedTo}__` : ""}${message.name}`;
  if (message.type === "Message") {
    file += `export interface ${newMessageName} {\r\n`;
    for (let body of message.body) {
      // if MessageHeader or Option
      if ("type" in body || "isOption" in body) {
        const [newContent, returnImports] = buildProtoMessages(body, localMessages, newImports, newMessageName);
        nestedContent += newContent;
        newImports = returnImports;
      } else {
        // Only Message body will be here
        file += getMessageBody(message, body as MessageBody, localMessages, newImports, nestedTo);
      }
    }
  } else {
    // Else: Enum
    file += `enum ${newMessageName} {\r\n`;
    for (const body of message.body) {
      if ("isOption" in body) {
        const [newContent, returnImports] = buildProtoMessages(body, localMessages, newImports, newMessageName);
        nestedContent += newContent;
        newImports = returnImports;
      } else {
        // Only Enum body will be here
        file += getEnumBody(body as EnumBody);
      }
    }
  }
  file += `}\r\n`;
  newLocalMessages[newMessageName] = newMessageName;
  return [nestedContent + file, newImports, newLocalMessages];
}

function getMessageBody(message: MessageHeader, body: MessageBody, localMessages: Record<string, string>, imports: Import[], nestedTo?: string): string {
  if (!body.datatype.packageName) {
    const [typeName, isTsType] = convertProtoTypeToTs(body.datatype.type);

    if (isTsType) {
      return `  ${body.name}: ${typeName};\r\n`;
    } else {
      const localMessage = localMessages[typeName];
      const newTypeName = localMessage ?? (nestedTo ? `${nestedTo}__${typeName}` : `${message.name}__${typeName}`);
      return `  ${body.name}${isOptional(body.optional)}: ${newTypeName}${isRepeated(body.repeated)};\r\n`;
    }
  } else {
    const packageName = body.datatype.packageName;
    const isFound = imports?.find((import_data) => import_data.packageName === packageName);
    if (isFound) {
      return `  ${body.name}${isOptional(body.optional)}: ${body.datatype.type}${isRepeated(body.repeated)};\r\n`;
    } else {
      return `  ${body.name}${isOptional(body.optional)}: ${message.name}__${body.datatype.packageName.replace(".", "__")}__${body.datatype.type}${isRepeated(body.repeated)};\r\n`;
    }
  }
}

function getEnumBody(body: EnumBody) {
  return `  ${body.name},\r\n`;
}

function isRepeated(repeated: boolean) {
  return repeated ? "[]" : "";
}

function isOptional(optional: boolean) {
  return optional ? "?" : "";
}

const Types: Record<string, string> = {
  double: "number",
  float: "number",
  int32: "number",
  int64: "number",
  uint32: "number",
  uint64: "number",
  sint32: "number",
  sint64: "number",
  fixed32: "number",
  fixed64: "number",
  sfixed32: "number",
  sfixed64: "number",
  bool: "boolean",
  string: "string",
  bytes: "string",
};

function convertProtoTypeToTs(p: string): [string, boolean] {
  if (Types[p]) {
    return [Types[p], true];
  }

  return [p, false];
}
