import { randomUUID } from 'crypto';

import type * as lambda from 'aws-lambda';
import * as AWS from 'aws-sdk';

import { ENV_LOG_GROUP_NAME } from './constants';

const cwLogs = new AWS.CloudWatchLogs();

const logGroupName = process.env[ENV_LOG_GROUP_NAME] as string;
if (!logGroupName) {
  throw new Error(`${ENV_LOG_GROUP_NAME} environment variable is unset`);
}

/** Handler that sends the full SNS event to logs */
export async function batchHandler(event: lambda.SNSEvent): Promise<void> {
  await sendLogEvents([
    {
      message: JSON.stringify(event),
      timestamp: Date.now(),
    },
  ]);
}

/** Handler that sends individual SNS Event Records. */
export async function recordHandler(event: lambda.SNSEvent): Promise<void> {
  const timestamp = Date.now();
  const logEvents = event.Records.map((record) => ({
    message: JSON.stringify(record),
    timestamp,
  }));

  await sendLogEvents(logEvents);
}

/** Handler that sends the raw message from each SNS record. */
export async function messageHandler(event: lambda.SNSEvent): Promise<void> {
  const timestamp = Date.now();
  const logEvents = event.Records.map((record) => ({
    message: record.Sns.Message,
    timestamp,
  }));

  await sendLogEvents(logEvents);
}

async function sendLogEvents(logEvents: AWS.CloudWatchLogs.InputLogEvents) {
  const logStreamName = randomUUID();

  await cwLogs
    .createLogStream({
      logGroupName,
      logStreamName,
    })
    .promise();

  await cwLogs
    .putLogEvents({
      logEvents,
      logGroupName,
      logStreamName,
    })
    .promise();
}
