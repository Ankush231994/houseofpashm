export type CsvDocument = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

export class CsvParseError extends Error {
  readonly row: number;

  constructor(message: string, row: number) {
    super(message);
    this.name = "CsvParseError";
    this.row = row;
  }
}

export function parseCsv(input: string): CsvDocument {
  const rows = parseRows(input.replace(/^\uFEFF/, ""));
  while (rows.length && rows.at(-1)?.every((value) => value === "")) rows.pop();
  if (!rows.length) throw new CsvParseError("CSV is empty.", 1);

  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) {
    throw new CsvParseError("CSV contains an empty column name.", 1);
  }
  const duplicate = headers.find(
    (header, index) => headers.indexOf(header) !== index,
  );
  if (duplicate) {
    throw new CsvParseError(`CSV contains duplicate column '${duplicate}'.`, 1);
  }

  const records = rows.slice(1).map((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== headers.length) {
      throw new CsvParseError(
        `Expected ${headers.length} columns but found ${values.length}.`,
        rowNumber,
      );
    }
    return Object.fromEntries(
      headers.map((header, valueIndex) => [header, values[valueIndex].trim()]),
    );
  });

  return { headers, rows: records };
}

function parseRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field) {
        throw new CsvParseError(
          "A quote may only start at the beginning of a field.",
          rows.length + 1,
        );
      }
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new CsvParseError("CSV ends inside a quoted field.", rows.length + 1);
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}
