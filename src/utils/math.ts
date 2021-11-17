const avg = (array: number[]): number => array.reduce((a, b) => a + b) / array.length;

const stdev = (array: number[]): number => {
  const n = array.length;
  const mean = avg(array);
  return Math.sqrt(array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
};

export const removeOutliers = (array: number[]): number[] => {
  const av = avg(array);
  const std = stdev(array);
  return array.filter((x) => Math.abs(av - x) < std);
};

export const median = (array: number[]): number => {
  const sorted = array.sort();
  const n = sorted.length;
  if (n % 2 === 0) return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return sorted[Math.floor(n / 2)];
};
