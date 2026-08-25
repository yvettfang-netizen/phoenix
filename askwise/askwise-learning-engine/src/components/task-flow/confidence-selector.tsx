type Props = {
  value?: string;
  required?: boolean;
};

export default function ConfidenceSelector({ value, required = false }: Props) {
  return (
    <label htmlFor="confidence">
      Confidence
      <select id="confidence" name="confidence" defaultValue={value} required={required}>
        <option>I know how to solve it</option>
        <option>I have an idea</option>
        <option>I am stuck</option>
        <option>I don&apos;t understand the question</option>
      </select>
    </label>
  );
}
