export function scoreSUS(answers) {
  if (!Array.isArray(answers) || answers.length !== 10 || answers.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) return null;
  const contribution = answers.reduce((sum, value, index) => sum + (index % 2 === 0 ? value - 1 : 5 - value), 0);
  return contribution * 2.5;
}

export function scoreASQ(answers) {
  if (!Array.isArray(answers) || answers.length !== 3) return null;
  const valid = answers.filter((value) => Number.isInteger(value) && value >= 1 && value <= 7);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

export function average(values) {
  const valid = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}
