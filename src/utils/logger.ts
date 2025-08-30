const messageColors = [
  '\x1b[32m',
  '\x1b[33m',
  '\x1b[34m',
  '\x1b[35m',
  '\x1b[36m',
];
const errorColor = '\x1b[41m';
const successColor = '\x1b[42m';
const resetColor = '\x1b[0m';

type LogType = 'message' | 'error' | 'success';

export function logger(
  message: string,
  place: string,
  type: LogType = 'message',
) {
  if (type === 'error') {
    console.log(`${errorColor}[${place}]${resetColor}`, message);
    return;
  }

  if (type === 'success') {
    console.log(`${successColor}[${place}]${resetColor}`, message);
    return;
  }

  const loggerEnabled = process.env.LOGGER_ENABLED === 'true' || false;

  if (!loggerEnabled) {
    return;
  }

  const colorIndex = place.length % Object.keys(messageColors).length;
  const colorCode = messageColors[colorIndex];

  console.log(`${colorCode}[${place}]${resetColor}`, message);
}
