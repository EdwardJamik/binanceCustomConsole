const { createLogger, format, transports } = require('winston');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { combine, printf } = format;
const path = require('path');
const fs = require('fs');

dayjs.extend(utc);
dayjs.extend(timezone);

const myFormat = printf(({ message, timestamp }) => {
    const formattedTimestamp = dayjs(timestamp).tz('Europe/Kiev').format('DD.MM.YYYY HH:mm:ss');
    return `${formattedTimestamp} ${message}`;
});

const loggers = {};

const createUserLogger = (chatId) => {

    if (!loggers[chatId]) {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }

        const logFilePath = path.join(logDir, `position-${chatId}.log`);

        loggers[chatId] = createLogger({
            level: 'info',
            format: combine(
                format.timestamp(),
                myFormat
            ),
            transports: [
                new transports.Console(),
                new transports.File({ filename: logFilePath })
            ]
        });
    }

    return loggers[chatId];
};

const logUserEvent = (chatId, message) => {
    const logger = createUserLogger(chatId);
    logger.info(message);
};

module.exports = logUserEvent;


