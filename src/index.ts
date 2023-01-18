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
