declare module 'byte-size' {
  function f(bytes: number, obj?: { precision?: number; units?: string }): {
    value: string;
    unit: string;
  };

  export = f;
}
