import { parseProto, parseProtoToJson } from "./ProtoParser";

(async () => {
  console.log(await parseProtoToJson("./ExampleProto/test.proto"));
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
