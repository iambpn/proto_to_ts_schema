import { ConvertProtoToTs } from "./BuildTsFile";
import { initializeCli } from "./Cli";

initializeCli();

// For Debug:
// ConvertProtoToTs("./Example/test.proto", "./out.ts", true);
// ConvertProtoToTs("./Example/nospace.proto", "./out.ts", true);
