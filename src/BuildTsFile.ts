import { ProtoJson, MessageHeader, Option, MessageBody, Import, EnumBody, Service, RPCFunction } from "./ProtoParser";

let tsFile = "";
let imports: Import[] = [];
const LocalMessages: Record<string, string> = {};

export function buildTsFile(proto: ProtoJson) {
  imports = proto.imports ?? [];
  if (proto.imports && proto.imports.length) {
    for (const importData of proto.imports) {
      tsFile += `import { ${importData.objs.join(", ")} } from "${importData.pathToPackage}/${importData.packageName}";\r\n`;
    }
  }
  tsFile += "\r\n";

  if (proto.messages && proto.messages.length) {
    for (const message of proto.messages) {
      tsFile += buildProtoMessages(message);
    }
  }

  if (proto.services && proto.services.length) {
    for (const service of proto.services) {
      tsFile += buildProtoServices(service);
    }
  }

  return tsFile;
}

function buildProtoServices(service: Service) {
  let file = `export interface ${service.name} {\r\n`;
  for (const rpcFunction of service.rpcFunctions) {
    file += buildRpcFunctions(rpcFunction);
  }
  file += "}\r\n";

  return file;
}

function buildRpcFunctions(rpcFunction: RPCFunction | Option) {
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
    returns = `${rpcFunction.returns.packageName}`;
  } else {
    const packageName = rpcFunction.returns.packageName;
    const isFound = imports?.find((import_data) => import_data.packageName === packageName);
    if (isFound) {
      returns = `${rpcFunction.returns.type}`;
    } else {
      returns = `${rpcFunction.returns.packageName.replace(".", "__")}__${rpcFunction.returns.type}`;
    }
  }
  return `  ${name}(data:${args}):${returns};\r\n`;
}

function buildProtoMessages(message: MessageHeader | Option, nestedTo?: string): string {
  let file = "";
  let nestedContent = "";

  if ("isOption" in message) {
    // Skip Options: Do Nothing
    return "";
  }

  message.name = `${nestedTo ? `${nestedTo}__` : ""}${message.name}`;
  if (message.type === "Message") {
    file += `export interface ${message.name} {\r\n`;
    for (let body of message.body) {
      // if MessageHeader or Option
      if ("type" in body || "isOption" in body) {
        nestedContent += buildProtoMessages(body, message.name);
      } else {
        // Only Message body will be here
        file += getMessageBody(message, body as MessageBody, nestedTo);
      }
    }
    file += `}\r\n`;
    LocalMessages[message.name] = message.name;
  } else {
    // Else: Enum
    file += `enum ${message.name} {\r\n`;
    for (const body of message.body) {
      if ("isOption" in body) {
        nestedContent += buildProtoMessages(body, message.name);
      } else {
        // Only Enum body will be here
        file += getEnumBody(body as EnumBody);
      }
    }
    file += `}\r\n`;
    LocalMessages[message.name] = message.name;
  }
  return nestedContent + file;
}

function getMessageBody(message: MessageHeader, body: MessageBody, nestedTo?: string): string {
  if (!body.datatype.packageName) {
    const [typeName, isTsType] = convertProtoTypeToTs(body.datatype.type);

    if (isTsType) {
      return `  ${body.name}: ${typeName};\r\n`;
    } else {
      const localMessage = LocalMessages[typeName];
      const newTypeName = localMessage ?? (nestedTo ? `${nestedTo}__${typeName}` : `${message.name}__${typeName}`);
      return `  ${body.name}: ${newTypeName};\r\n`;
    }
  } else {
    const packageName = body.datatype.packageName;
    const isFound = imports?.find((import_data) => import_data.packageName === packageName);
    if (isFound) {
      return `  ${body.name}: ${body.datatype.type},\r\n`;
    } else {
      return `  ${body.name}: ${message.name}__${body.datatype.packageName.replace(".", "__")}__${body.datatype.type},\r\n`;
    }
  }
}

function getEnumBody(body: EnumBody) {
  return `  ${body.name},\r\n`;
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
