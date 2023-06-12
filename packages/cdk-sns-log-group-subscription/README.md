# SNS Log Group Subscription

This AWS CDK construct library provides `LogGroupSubscription`, which
subscribes a CloudWatch LogGroup to an SNS topic. Uses for this construct
might include:

- Logging AWS SES Notifications via SNS Topic
- Debugging an application that publishes to an SNS Topic
- Logging events not published other than to an SNS Topic

## Example Usage

```ts
const topic = new aws_sns.Topic(stack, 'Topic');
const logGroup = new aws_logs.LogGroup(stack, 'LogGroup');

topic.addSubscription(
  new LogGroupSubscription({
    logGroup,
    logFormat: LogFormat.MESSAGE,
  }),
);
```