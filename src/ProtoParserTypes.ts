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