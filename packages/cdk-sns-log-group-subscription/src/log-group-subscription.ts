import * as path from 'path';

import { Names } from 'aws-cdk-lib';
import * as aws_iam from 'aws-cdk-lib/aws-iam';
import * as aws_lambda from 'aws-cdk-lib/aws-lambda';
import * as aws_logs from 'aws-cdk-lib/aws-logs';
import * as aws_sns from 'aws-cdk-lib/aws-sns';
import * as aws_sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

import { ENV_LOG_GROUP_NAME } from './constants';

/**
 * Format of the log.
 */
export enum LogFormat {
  /**
   * Log the complete SNS record batch. (i.e., one or more records.)
   */
  BATCH = 'BATCH',

  /**
   * Log each SNS record individually.
   */
  RECORD = 'RECORD',

  /**
   * Log the unenveloped record.
   */
  MESSAGE = 'MESSAGE',
}

/**
 * Props for LogGroupSubscription.
 */
export interface LogGroupSubscriptionProps
  extends aws_sns_subscriptions.SubscriptionProps {
  /**
   * LogGroup to subscribe to the SNS Topic.
   * @default - a new log group will be created.
   */
  readonly logGroup?: aws_logs.ILogGroup;

  /**
   * Choose the log format to use.
   * @default LogFormat.RECORD
   */
  readonly logFormat?: LogFormat;
}

/**
 * Subscribes a CloudWatch LogGroup to your topic.
 */
export class LogGroupSubscription implements aws_sns.ITopicSubscription {
  private readonly logGroup?: aws_logs.ILogGroup;
  private readonly subscriptionProps?: aws_sns_subscriptions.SubscriptionProps;
  private readonly logFormat: LogFormat;

  constructor(options: LogGroupSubscriptionProps = {}) {
    this.logGroup = options.logGroup;
    this.logFormat = options.logFormat ?? LogFormat.RECORD;
    this.subscriptionProps = options;
  }

  bind(topic: aws_sns.ITopic): aws_sns.TopicSubscriptionConfig {
    const logGroup = this.logGroup ?? new aws_logs.LogGroup(topic, 'LogGroup');
    const logGroupUniqueness = Names.nodeUniqueId(logGroup.node);

    const lambda = new LogFunction(
      topic,
      `LogGroupSubscription${logGroupUniqueness}`,
      {
        logGroup,
        logFormat: this.logFormat,
      },
    );

    return new aws_sns_subscriptions.LambdaSubscription(
      lambda,
      this.subscriptionProps,
    ).bind(topic);
  }
}

interface LogFunctionProps {
  readonly logGroup: aws_logs.ILogGroup;
  readonly logFormat: LogFormat;
}

class LogFunction extends aws_lambda.Function {
  constructor(scope: Construct, id: string, props: LogFunctionProps) {
    const { logGroup, logFormat } = props;

    super(scope, id, {
      runtime: aws_lambda.Runtime.NODEJS_14_X,
      // Each log format has its own handler.
      handler: renderHandler(logFormat),
      code: aws_lambda.Code.fromAsset(
        path.join(__dirname, '../assets/log.lambda'),
      ),
      environment: {
        [ENV_LOG_GROUP_NAME]: logGroup.logGroupName,
      },
      retryAttempts: 2,
      initialPolicy: [
        new aws_iam.PolicyStatement({
          effect: aws_iam.Effect.ALLOW,
          resources: [logGroup.logGroupArn],
          actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        }),
      ],
    });
  }
}

function renderHandler(logFormat: LogFormat): string {
  switch (logFormat) {
    case LogFormat.BATCH:
      return 'index.batchHandler';
    case LogFormat.RECORD:
      return 'index.recordHandler';
    case LogFormat.MESSAGE:
      return 'index.messageHandler';
  }
}
