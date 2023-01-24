import * as fs from "fs/promises";
import { buildTsFile } from "./BuildTsFile";
import { parseProto, parseProtoToJson } from "./ProtoParser";

(async () => {
  const parsedData = await parseProto("./Example/test.proto");
  console.dir(parsedData, { depth: 10 });

  const zodFile = buildTsFile(parsedData);
  console.log(zodFile);
  fs.writeFile("./out.ts", zodFile, { encoding: "utf-8" });
})();
