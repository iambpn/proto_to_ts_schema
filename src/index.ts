import * as fs from "fs/promises";
import { ParseProtoFile, ParseProtoLine, printGlobalVars } from "./protoParser";

// (async () => {
//   const proto = await fs.readFile("./proto/test.proto", { encoding: "utf-8" });

//   let result = "";
//   for (const line of proto.split("\n")) {
//     // const data = parseProtobufLine(line);
//     const data = ParseProtoFile(line);
//     if (data) {
//       // result += data;
//       // result += "\n";
//       console.log(data);
//       console.log("");
//     }
//   }

//   // console.log(result);
// })();

(async () => {
  const proto = await fs.readFile("./ExampleProto/test.proto", { encoding: "utf-8" });

  const lines = ParseProtoFile(proto);
  console.log(lines);

  for (const line of lines) {
    ParseProtoLine(line);
  }
  printGlobalVars();
})();

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
