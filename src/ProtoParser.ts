export const MessageHeaderTypes = {
  Message: "message",
  Enum: "enum",
} as const;

export type Import = {
  packageName: string; // Name of file to import from
  pathToPackage: string; // Path to import file (fileName not included)
  fullPath: string; // Full proto import
  objs: string[]; // Objects to import from PackageName file
};

export type Option = {
  name: string;
  value: string;
  isOption: true;
};

export type Indent = {
  indentCount: number;
  indentChar: string;
};

export type MessageHeader = {
  name: string;
  body: AllMessage[];
  type: keyof typeof MessageHeaderTypes;
  indent?: Indent;
};

export type MessageBody = {
  name: string;
  datatype: {
    packageName?: string; // File Name to import from. (if empty then import form current file)
    type: string; // Datatype or Object name
  };
  repeated: boolean;
  optional: boolean;
  indent?: Indent;
};

export type EnumBody = {
  name: string;
  value: number;
  indent?: Indent;
};

export type AllMessage = MessageHeader | MessageBody | EnumBody | Option;

export type RPCFunction = {
  name: string;
  arg: {
    packageName?: string;
    type: string;
  };
  returns: {
    packageName?: string;
    type: string;
  };
};

export type Service = {
  name: string;
  rpcFunctions: (RPCFunction | Option)[];
};

export type LastMessageType = keyof typeof MessageHeaderTypes | "Service";

export type Syntax = string;

export type Package = string;

export type ProtoJson = {
  imports?: Import[];
  messages?: (MessageHeader | Option)[];
  syntax?: Syntax;
  package?: Package;
  services?: Service[];
};

export type ParseProtoLineReturn = {
  imports: Map<string, Import>;
  messages: (MessageHeader | Option)[];
  services: Service[];
  syntax: string;
  package_name: string;
  nestedLevel: number;
  lastMessageType: LastMessageType | undefined;
};

// ---------- Type Deceleration End ----------- //

function ParseProtoFile(file: string): string[] {
  if (!file) {
    return [];
  }

  // Filter Boolean to remove empty string.
  const lines = file
    .trim()
    // remove multi line comment
    .replace(/\/\*(.|\n|\r)+\*\//gm, "")
    // remove starting single line comment (wont remove single line comment after code.)
    .replace(/^\/\/.+/, "")
    // remove extra {} in rpc function (regex used: Positive lookbehind)
    .replace(/(?<=\) *){}/gm, "")
    // adding '\r;\n' at the end of remaining comment (regex used: Positive lookbehind)
    .replace(/(?<=[\/]{2}.*)(\n|\r)/gm, "\r;\n")
    .replace(/\}/gm, ";};")
    .replace(/=/gm, " = ") // padding
    .replace(/\/\//gm, " // ") // padding
    .replace(/\)returns\(/gm, ") returns (") // padding
    .split(/{|;/)
    .map((x) => x.replace(/\n|\r/gm, " ").trim())
    .filter(Boolean);

  return lines;
}

function deepCopyObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function ParseProtoLine(
  line: string,
  imports_arg: Map<string, Import>,
  messages_arg: (MessageHeader | Option)[],
  services_arg: Service[],
  nestedLevel: number,
  lastMessageType?: LastMessageType
): ParseProtoLineReturn {
  const localImports = new Map(deepCopyObject([...imports_arg]));
  const messages = deepCopyObject(messages_arg);
  const services = deepCopyObject(services_arg);

  let syntax = "";
  let package_name = "";

  const tokens = line
    .split(" ")
    .filter(Boolean)
    .map((token) => cleanText(token));

  let isRepeated = false;
  let isOptional = false;

  switch (tokens[0]) {
    case "//":
      {
        const commentToken = line.substring(2).split(/:| /).filter(Boolean);
        if (commentToken[0] === "package") {
          const packageName = commentToken[1];
          let lastImport = Array.from(localImports.keys()).pop();
          const import_data = localImports.get(lastImport ?? "");

          if (import_data) {
            localImports.delete(lastImport ?? "");
            import_data.packageName = packageName;
            localImports.set(packageName, import_data);
          }
        }
        // could be added here more to interpret comments.
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "syntax":
      {
        syntax = tokens[tokens.length - 1];
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "package":
      {
        package_name = tokens[tokens.length - 1];
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "import":
      {
        const fullPath = tokens[tokens.length - 1];
        const pathTokens = fullPath.split("/");
        const packageName = pathTokens[pathTokens.length - 1].split(".")[0];

        localImports.set(packageName, {
          objs: [],
          packageName,
          pathToPackage: pathTokens.length > 1 ? pathTokens.slice(0, -1).join("/") : ".",
          fullPath,
        });
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "option":
      {
        const optionMessage = {
          name: tokens[1],
          value: tokens[tokens.length - 1],
          isOption: true,
        } as Option;
        if (lastMessageType !== "Service") {
          getMessageBodyToInsert(nestedLevel, messages).push(optionMessage);
        } else {
          services[services.length - 1].rpcFunctions.push(optionMessage);
        }
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "message":
      {
        const message: MessageHeader = {
          name: tokens[1],
          type: "Message",
          body: [],
        };
        getMessageBodyToInsert(nestedLevel, messages).push(message);
        nestedLevel += 1;
        lastMessageType = "Message";
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "enum":
      {
        const message: MessageHeader = {
          name: tokens[1],
          type: "Enum",
          body: [],
        };
        getMessageBodyToInsert(nestedLevel, messages).push(message);
        nestedLevel += 1;
        lastMessageType = "Enum";
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "service":
      {
        services.push({
          name: tokens[1],
          rpcFunctions: [],
        });
        nestedLevel += 1;
        lastMessageType = "Service";
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "rpc":
      {
        const rpcTokens = line.split(/ |\(|\)/gm).filter(Boolean);

        const [argPackageName, argObjName] = getPackageNameAndObjName(rpcTokens[2]);
        const argImport = localImports.get(argPackageName ?? "");
        if (argImport && argPackageName) {
          const importData = updateImportObjsProperty(argImport, argObjName);
          localImports.set(argPackageName, importData);
        }

        const [returnPackageName, returnObjName] = getPackageNameAndObjName(rpcTokens[4]);
        const returnImport = localImports.get(returnPackageName ?? "");
        if (returnImport && returnPackageName) {
          const importData = updateImportObjsProperty(returnImport, returnObjName);
          localImports.set(returnPackageName, importData);
        }

        const rpcFn: RPCFunction = {
          name: rpcTokens[1],
          arg: {
            packageName: argPackageName,
            type: argObjName,
          },
          returns: {
            packageName: returnPackageName,
            type: returnObjName,
          },
        };
        services[services.length - 1].rpcFunctions.push(rpcFn);
      }
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "}":
      nestedLevel -= 1;
      lastMessageType = undefined;
      return {
        imports: localImports,
        messages,
        services,
        syntax,
        package_name,
        nestedLevel,
        lastMessageType,
      };
    case "repeated":
      isRepeated = true;
      break;
    case "optional":
      isOptional = true;
      break;
  }

  const lastMessage = messages[messages.length - 1];

  //skip if Message header is not the last element of Messages
  if (!("type" in lastMessage)) {
    return {
      imports: localImports,
      messages,
      services,
      syntax,
      package_name,
      nestedLevel,
      lastMessageType,
    };
  }

  const parentMessage = getLastMessageHeader(nestedLevel, lastMessage);

  let message: MessageBody | EnumBody;
  if (parentMessage.type === "Message") {
    const datatype = isRepeated || isOptional ? tokens[1] : tokens[0];
    const [dataTypePackageName, dataTypeObj] = getPackageNameAndObjName(datatype);

    const datatypeImport = localImports.get(dataTypePackageName ?? "");
    if (datatypeImport && dataTypePackageName) {
      const importData = updateImportObjsProperty(datatypeImport, dataTypeObj);
      localImports.set(dataTypePackageName, importData);
    }

    message = {
      datatype: {
        packageName: dataTypePackageName,
        type: dataTypeObj,
      },
      name: isRepeated || isOptional ? tokens[2] : tokens[1],
      optional: isOptional,
      repeated: isRepeated,
    } as MessageBody;
  } else {
    // Option will be caught in switch case so this must be enum.
    message = {
      name: tokens[0],
      value: +tokens[2],
    } as EnumBody;
  }

  parentMessage.body.push(message);
  return {
    imports: localImports,
    messages,
    services,
    syntax,
    package_name,
    nestedLevel,
    lastMessageType,
  };
}

function getLastMessageHeader(nestedCount: number, lastMessage: MessageHeader): MessageHeader {
  const lastElement = lastMessage.body[lastMessage.body.length - 1] as MessageHeader;
  if (nestedCount > 1 && lastElement) {
    return getLastMessageHeader(nestedCount - 1, lastElement);
  } else {
    return lastMessage;
  }
}

function getMessageBodyToInsert(nestedCount: number, bodyNode: AllMessage[]): AllMessage[] {
  /**
   * Since we are tacking nested count the possibility of not having insertToNode of type AllMessage[] is 0
   */

  if (nestedCount > 0) {
    const lastElement = bodyNode[bodyNode.length - 1] as MessageHeader;
    return getMessageBodyToInsert(nestedCount - 1, lastElement.body);
  }

  return bodyNode;
}

function insertAndGetUniqueStrings(objs: string[], obj_name: string): string[] {
  const set_data = new Set(objs);
  set_data.add(obj_name);
  return Array.from(set_data);
}

function getPackageNameAndObjName(messageType: string): [string | undefined, string] {
  const messageTypeToken = messageType.split(".");

  // For Import Management
  const packageName = messageTypeToken.length > 1 ? messageTypeToken.slice(0, -1).join(".") : undefined;
  const objName = messageTypeToken[messageTypeToken.length - 1];

  return [packageName, objName];
}

function updateImportObjsProperty(import_data: Import, obj_name: string): Import {
  const localImport = deepCopyObject(import_data);
  const newObjs = insertAndGetUniqueStrings(localImport.objs, obj_name);
  localImport.objs = newObjs;
  return localImport;
}

function cleanText(text: string) {
  return text.replace(/"|'/g, "").trim();
}

/**
 * For debugging
 */
function _printGlobalVars(imports: any, syntax: any, package_name: any, messages: any, services: any) {
  console.log(imports);
  console.log(syntax);
  console.log(package_name);
  console.dir(messages, { depth: 10 });
  console.dir(services, { depth: 10 });
}

export async function parseProto(protoFile: string): Promise<ProtoJson> {
  let imports: Map<string, Import> = new Map();
  let syntax: Syntax = "";
  let package_name: Package = "";
  let messages: (MessageHeader | Option)[] = [];
  let services: Service[] = [];
  let nestedLevel = 0;
  let lastMessageType: LastMessageType | undefined;

  const lines = ParseProtoFile(protoFile);
  for (const line of lines) {
    try {
      const parsedData = ParseProtoLine(line, imports, messages, services, nestedLevel, lastMessageType);
      imports = parsedData.imports;
      syntax ||= parsedData.syntax;
      package_name ||= parsedData.package_name;
      messages = parsedData.messages;
      services = parsedData.services;
      nestedLevel = parsedData.nestedLevel;
      lastMessageType = parsedData.lastMessageType;
    } catch (error) {
      console.log("Error on line:", line);
      throw error;
    }
  }

  const returnData = {
    syntax,
    package: package_name,
    imports: Array.from(imports.values()),
    messages: messages,
    services: services,
  };
  return returnData;
}

export async function parseProtoToJson(protoFile: string): Promise<string> {
  const returnData = await parseProto(protoFile);
  return JSON.stringify(returnData);
}
