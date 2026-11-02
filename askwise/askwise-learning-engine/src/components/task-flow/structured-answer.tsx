export default function StructuredAnswer({ value }: { value: string }) {
  try {
    const record = JSON.parse(value);
    const fields = [["conditions", "Conditions / material signals"], ["method", "Method / principle"], ["work", "Original reasoning"], ["conclusion", "Conclusion / uncertainty"]];
    if (record && fields.every(([key]) => typeof record[key] === "string")) {
      return <dl>{fields.filter(([key]) => record[key]).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{record[key]}</dd></div>)}</dl>;
    }
  } catch { /* Historical plain-text responses remain readable. */ }
  return <p>{value || "No response recorded"}</p>;
}
