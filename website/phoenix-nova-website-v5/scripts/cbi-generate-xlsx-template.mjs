import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";

const templateUrl = new URL("../templates/cbi-country-record.template.json", import.meta.url);
const outputUrl = new URL("../templates/cbi-country-record.template.xlsx", import.meta.url);
const [row] = JSON.parse(await readFile(templateUrl, "utf8"));
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("CBI");
const headers = Object.keys(row);
worksheet.addRow(headers);
worksheet.addRow(headers.map(key => {
  const value = row[key];
  return value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : value;
}));
worksheet.views = [{ state: "frozen", ySplit: 1 }];
worksheet.getRow(1).font = { bold: true };
await workbook.xlsx.writeFile(outputUrl);
console.log(`Wrote ${outputUrl.pathname}`);
