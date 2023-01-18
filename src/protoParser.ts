const MessageHeaderTypes = {
  Message: "message",
  Enum: "enum",
} as const;

type Import = {
  packageName: string;
  path: string;
  objs: string[];
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
  datatype: string;
  repeated: boolean;
  optional: boolean;
  indent?: Indent;
};

type EnumBody = {
  name: string;
  position: number;
  indent?: Indent;
};

type RPCFunction = {
  name: string;
  arg: string;
  return: string;
};

type Service = {
  name: string;
  rpcFunctions: RPCFunction[];
};

type Syntax = string;

type Package = string;

type Nested = boolean;

type Line = {
  import?: Import;
  option?: Option;
  message?: MessageHeader;
  syntax?: Syntax;
  package?: Package;
};

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

function convertProtoTypeToTs(p: string) {
  if (Types[p]) {
    return Types[p];
  }

  return p;
}

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
          let lastImport = Array.from(imports.keys()).pop();
          if (lastImport && imports.has(lastImport)) {
            imports.get(lastImport)!.packageName = commentToken[1];
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
        const key = tokens[tokens.length - 1];
        imports.set(key, {
          objs: [],
          packageName: key.split(".")[0],
          path: key,
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

  
}

function insertMessage(nestedCount: number, message: MessageHeader | MessageBody | EnumBody, insertToNode: (MessageHeader | MessageBody | EnumBody)[]) {
  if (nestedCount > 0) {
    const lastElement = insertToNode[insertToNode.length - 1] as MessageHeader;
    insertMessage(nestedCount - 1, message, lastElement.body);
    return;
  }

  insertToNode.push(message);
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
