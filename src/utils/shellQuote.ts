const shellUnsafePattern = /[\s"'\\$`!#&*();<>?[\]^{|}~]/;

export function quoteShellArg(value: string) {
  const argument = value;

  if (argument === "") {
    return "''";
  }

  if (!shellUnsafePattern.test(argument)) {
    return argument;
  }

  return `'${argument.replace(/'/g, `'\\''`)}'`;
}

export function quoteShellArgs(args: string[]) {
  return args.map(quoteShellArg).join(" ");
}

export function quotePowerShellArg(value: string) {
  return `'${value.trim().replace(/'/g, "''")}'`;
}