import { App, aws_logs, aws_sns, CfnOutput, Stack } from 'aws-cdk-lib';

import { LogFormat, LogGroupSubscription } from '../src';

const app = new App();
const stack = new Stack(app, 'integ-sns-topic-logs');

const topic = new aws_sns.Topic(stack, 'Topic');
const logGroup = new aws_logs.LogGroup(stack, 'LogGroup');

topic.addSubscription(
  new LogGroupSubscription({
    logGroup,
    logFormat: LogFormat.MESSAGE,
  }),
);

new CfnOutput(stack, 'TopicName', {
  value: topic.topicName,
});

new CfnOutput(stack, 'LogGroupName', {
  value: logGroup.logGroupName,
});

app.synth();
