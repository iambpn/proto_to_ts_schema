export type Options = {
  proto_files?: string[];
  proto_path?: string;
  out?: string;
  config?: string;
  help?: boolean;
};

export type ConfiguredOption = Required<Omit<Options, "config">> & Pick<Options, "config">;

export type OptionKeys = keyof Options;
