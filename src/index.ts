import * as fs from "fs/promises";
import { buildZod } from "./BuildZod";
import { parseProto, parseProtoToJson } from "./ProtoParser";

(async () => {
  const parsedData = await parseProto("./Example/test.proto");
  const zodFile = buildZod(parsedData);
  console.log(zodFile);
  fs.writeFile("./out.ts", zodFile, { encoding: "utf-8" });
})();
