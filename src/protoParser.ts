const MessageHeaderTypes = {
  Message: "message",
  Enum: "enum",
} as const;

type Import = {
  packageName: string; // Name of file to import from
  pathToPackage: string; // Path to import file (fileName not included)
  fullPath: string; // Full proto import
  objs: string[]; // Objects to import from PackageName file
};

type Option = {
  name: string;
  value: string;
};

type Indent = {
  indentCount: number;
  indentChar: string;
};

type MessageHeader = {
  name: string;
  body: (MessageBody | EnumBody | MessageHeader)[];
  type: keyof typeof MessageHeaderTypes;
  indent?: Indent;
};

type MessageBody = {
  name: string;
  datatype: {
    packageName?: string; // File Name to import from. (if empty then import form current file)
    type: string; // Datatype or Object name
  };
  repeated: boolean;
  optional: boolean;
  indent?: Indent;
};

type EnumBody = {
  name: string;
  value: number;
  indent?: Indent;
};

type AllMessage = MessageHeader | MessageBody | EnumBody;

type RPCFunction = {
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

type Service = {
  name: string;
  rpcFunctions: RPCFunction[];
};

type Syntax = string;

type Package = string;

type Line = {
  import?: Import;
  option?: Option;
  message?: MessageHeader;
  syntax?: Syntax;
  package?: Package;
};

export function ParseProtoFile(file: string): string[] {
  if (!file) {
    return [];
  }

  // Filter Boolean to remove empty string.
  const lines = file
    .trim()
    // remove multi line comment
    .replace(/\/\*(.|\n|\r)+\*\//gm, "")
    // remove single one line comment (wont remove single line comment after code.)
    .replace(/^\/\/.+/, "")
    // remove extra {} in rpc function
    .replace(/\{\}/gm, "")
    .replace(/{/gm, " {\n ")
    .replace(/}/gm, " }\n ")
    .replace(/;/gm, " ;\n ")
    .replace(/=/gm, " = ")
    .replace(/\/\//gm, " // ")
    .replace(/\)returns\(/gm, ") returns (")
    .split(/\n|\r|;/)
    .map((x) => x.trim())
    .filter(Boolean);

  return lines;
}

const imports: Map<string, Import> = new Map();
let syntax: Syntax;
let package_name: Package;
const options: Option[] = [];
const messages: MessageHeader[] = [];
const services: Service[] = [];
let nestedLevel = 0;
let lastMessageType: keyof typeof MessageHeaderTypes | undefined;

export function ParseProtoLine(line: string) {
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
          let lastImport = Array.from(imports.keys()).pop();
          const import_data = imports.get(lastImport ?? "");

          if (import_data) {
            imports.delete(lastImport ?? "");
            import_data.packageName = packageName;
            imports.set(packageName, import_data);
          }
        }
      }
      return;
    case "syntax":
      {
        syntax = tokens[tokens.length - 1];
      }
      return;
    case "package":
      {
        package_name = tokens[tokens.length - 1];
      }
      return;
    case "import":
      {
        const fullPath = tokens[tokens.length - 1];
        const pathTokens = fullPath.split("/");
        const packageName = pathTokens[pathTokens.length - 1].split(".")[0];

        imports.set(packageName, {
          objs: [],
          packageName,
          pathToPackage: pathTokens.length > 1 ? pathTokens.slice(0, -1).join("/") : ".",
          fullPath,
        });
      }
      return;
    case "option":
      {
        options.push({
          name: tokens[1],
          value: tokens[tokens.length - 1],
        });
      }
      return;
    case "message":
      {
        const message: MessageHeader = {
          name: tokens[1],
          type: "Message",
          body: [],
        };
        insertMessage(nestedLevel, message, messages);
        nestedLevel += 1;
      }
      return;
    case "enum":
      {
        const message: MessageHeader = {
          name: tokens[1],
          type: "Enum",
          body: [],
        };
        insertMessage(nestedLevel, message, messages);
        nestedLevel += 1;
      }
      return;
    case "service":
      {
        services.push({
          name: tokens[1],
          rpcFunctions: [],
        });
      }
      return;
    case "rpc":
      {
        const rpcTokens = line.split(/ |\(|\)/gm).filter(Boolean);

        const [argPackageName, argObjName] = getPackageNameAndObjName(rpcTokens[2]);
        const [returnPackageName, returnObjName] = getPackageNameAndObjName(rpcTokens[4]);

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
      return;
    case "}":
      nestedLevel -= 1;
      return;
    case "repeated":
      isRepeated = true;
      break;
    case "optional":
      isOptional = true;
      break;
  }

  const parentMessage = getLastMessageHeader(messages[messages.length - 1], messages[messages.length - 1]);

  let message: MessageBody | EnumBody;
  if (parentMessage.type === "Message") {
    const datatype = isRepeated || isOptional ? tokens[1] : tokens[0];
    const [dataTypePackageName, dataTypeObj] = getPackageNameAndObjName(datatype);
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
    message = {
      name: tokens[0],
      value: +tokens[2],
    } as EnumBody;
  }

  parentMessage.body.push(message);
}

function getLastMessageHeader(lastMessage: AllMessage, parentMessage: MessageHeader): MessageHeader {
  if (!lastMessage || !("body" in lastMessage)) {
    return parentMessage;
  }

  return getLastMessageHeader(lastMessage.body[lastMessage.body.length - 1], lastMessage);
}

function insertMessage(nestedCount: number, message: AllMessage, insertToNode: AllMessage[]) {
  if (nestedCount > 0) {
    const lastElement = insertToNode[insertToNode.length - 1] as MessageHeader;
    insertMessage(nestedCount - 1, message, lastElement.body);
    return;
  }

  insertToNode.push(message);
}

function insertImport(package_name: string, obj: string) {
  const import_data = imports.get(package_name);
  if (import_data) {
    const set_data = new Set(import_data.objs);
    set_data.add(obj);
    import_data.objs = Array.from(set_data);
  }
}
function getPackageNameAndObjName(messageType: string): [string | undefined, string] {
  const messageTypeToken = messageType.split(".");

  // For Import Management
  const packageName = messageTypeToken.length > 1 ? messageTypeToken.slice(0, -1).join(".") : undefined;
  const objName = messageTypeToken[messageTypeToken.length - 1];

  insertImport(packageName ?? "", objName);

  return [packageName, objName];
}

function cleanText(text: string) {
  return text.replace(/"|'/g, "").trim();
}

export function printGlobalVars() {
  console.log(imports);
  console.log(syntax);
  console.log(package_name);
  console.log(options);
  console.dir(messages, { depth: 10 });
  console.dir(services, { depth: 10 });
}
