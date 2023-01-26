import { ProtoJson, MessageHeader, Option, MessageBody, Import, EnumBody, Service, RPCFunction } from "./ProtoParser";

export function buildTsFile(proto: ProtoJson) {
  let tsFile = "";
  const LocalMessages: Record<string, string> = {};
  const imports: Import[] = proto.imports ?? [];

  if (proto.imports && proto.imports.length) {
    for (const importData of proto.imports) {
      tsFile += `import { ${importData.objs.join(", ")} } from "${importData.pathToPackage}/${importData.packageName}";\r\n`;
    }
  }
  tsFile += "\r\n";

  if (proto.messages && proto.messages.length) {
    for (const message of proto.messages) {
      const [content, newImports] = buildProtoMessages(message, LocalMessages, imports);
      tsFile += content;
      imports.push(...newImports);
    }
  }

  if (proto.services && proto.services.length) {
    for (const service of proto.services) {
      tsFile += buildProtoServices(service, imports);
    }
  }

  return tsFile;
}

function buildProtoServices(service: Service, imports: Import[]): string {
  let file = `export interface ${service.name} {\r\n`;
  for (const rpcFunction of service.rpcFunctions) {
    file += buildRpcFunctions(rpcFunction, imports);
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

/**
 *
 * @param message
 * @param localMessages
 * @param imports
 * @param nestedTo
 * @returns [content, MessageName]
 */
function buildProtoMessages(message: MessageHeader | Option, localMessages: Record<string, string>, imports: Import[], nestedTo?: string): [string, Import[]] {
  let file = "";
  let nestedContent = "";
  let newImports: Import[] = [];

  if ("isOption" in message) {
    // Skip Options: Do Nothing
    return [file, newImports];
  }

  const newMessageName = `${nestedTo ? `${nestedTo}__` : ""}${message.name}`;
  if (message.type === "Message") {
    file += `export interface ${newMessageName} {\r\n`;
    for (let body of message.body) {
      // if MessageHeader or Option
      if ("type" in body || "isOption" in body) {
        const [newContent, returnImports] = buildProtoMessages(body, localMessages, imports, newMessageName);
        nestedContent += newContent;
        newImports.push(...returnImports);
      } else {
        // Only Message body will be here
        file += getMessageBody(message, body as MessageBody, localMessages, imports, nestedTo);
      }
    }
    file += `}\r\n`;
  } else {
    // Else: Enum
    file += `enum ${newMessageName} {\r\n`;
    for (const body of message.body) {
      if ("isOption" in body) {
        const [newContent, returnImports] = buildProtoMessages(body, localMessages, imports, newMessageName);
        nestedContent += newContent;
        newImports.push(...returnImports);
      } else {
        // Only Enum body will be here
        file += getEnumBody(body as EnumBody);
      }
    }
    file += `}\r\n`;
  }
  return [nestedContent + file, newImports];
}

function getMessageBody(message: MessageHeader, body: MessageBody, localMessages: Record<string, string>, imports: Import[], nestedTo?: string): string {
  if (!body.datatype.packageName) {
    const [typeName, isTsType] = convertProtoTypeToTs(body.datatype.type);

    if (isTsType) {
      return `  ${body.name}: ${typeName};\r\n`;
    } else {
      const localMessage = localMessages[typeName];
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
