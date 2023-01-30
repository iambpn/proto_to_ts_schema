export interface P2tType {
  rpcFuncReturn?: (rtn_type: string) => string; // Function (type:string):string =>{...}
  imports?: string[]; // additional imports to include in TS file. Options: Array<string> | undefined
}
