import { ProtoJson, AllMessage, MessageHeader, Option, MessageBody } from "./ProtoParser";

let zodFile = `import { z } from "zod";\r\n`;
export function buildZod(proto: ProtoJson) {
  if (proto.imports && proto.imports.length) {
    for (const importData of proto.imports) {
      zodFile += `import { ${importData.objs.join(", ")} } from "${importData.pathToPackage}/${importData.packageName}";\r\n`;
    }
  }
  zodFile += "\r\n";

  if (proto.messages && proto.messages.length) {
    for (const message of proto.messages) {
      zodFile += buildProtoMessages(message);
    }
  }

  return zodFile;
}

function buildProtoMessages(message: MessageHeader | Option): string {
  let file = "";
  let nestedFile = "";

  if ("isOption" in message) {
    // Skip Options: Do Nothing
    return "";
  }

  if (message.type === "Message") {
    file += `export const ${message.name} = z.object({\r\n`;
    for (let body of message.body) {
      if ("type" in body || "isOption" in body) {
        nestedFile += buildProtoMessages(body);
      } else {
        // Only Message body will be here
        body = body as MessageBody;

        const [typeName, isTsType] = convertProtoTypeToTs(body.datatype.type);

        if (isTsType) {
          file += `${body.name}: z.${typeName}(),\r\n`;
        } else {
          file += `${body.name}: ${typeName},\r\n`;
        }
      }
    }
    file += `});\r\n`;
  } else {
    // Else: Enum
    file += `enum _${message.name}_ENUM {\r\n`;
    for (const body of message.body) {
      if ("isOption" in body) {
        nestedFile += buildProtoMessages(body);
      } else {
        // Only Enum body will be here
        file += `${body.name},\r\n`;
      }
    }
    file += `}\r\n`;
    file += `export const ${message.name} = z.nativeEnum(_${message.name}_ENUM);\r\n`;
  }
  file += `type ${message.name}_Type = z.infer<typeof ${message.name}>;\r\n\r\n`;

  return nestedFile + file;
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

function convertProtoTypeToTs(p: string): (string | boolean)[] {
  if (Types[p]) {
    return [Types[p], true];
  }

  return [p, false];
}

//Todo: changeNameOfNestedFields
//Todo: Service implementation
