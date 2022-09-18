const ceilToTick = (num) => {
  const n = Math.round(num * 100);

  return (n - (n % 5)) / 100;
};

const roundToTick = (num) => {
  const n = Math.round(num * 100);

  return (n - (n % 5)) / 100;
};

module.exports = { roundToTick, ceilToTick };
